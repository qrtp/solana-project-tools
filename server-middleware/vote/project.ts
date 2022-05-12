import { read, write } from '../storage/persist'
import { getHodlerRolesWithFallback } from '../verify/holder'
import { getPublicKeyFilePath, getVoteFilePath, getVoteResultsFilePath } from '../verify/paths'
import { getConfig } from '../verify/project'
import { isUserEligible } from './user'
const loggerWithLabel = require('../logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("vote-project")

// retrieves the current holder list in JSON format
export async function getAllProjectVotes(name: any) {
    var voteStr = await read(getVoteFilePath(name))
    return JSON.parse((voteStr != "") ? voteStr : "[]")
}

// removes a vote from project if no votes yet received
export async function deleteVote(project: string, voteID: string) {

    // determine if any results
    logger.info(`removing project ${project} vote ${voteID}`)
    var voteResultsStr = await read(getVoteResultsFilePath(project, voteID))
    if (voteResultsStr) {
        logger.info(`votes already cast for project ${project} vote ${voteID}`)
        return false
    }

    // update map and remove the vote
    var updatedVotes = []
    var removedVote = false
    var currentVotes = await getAllProjectVotes(project)
    for (var i = 0; i < currentVotes.length; i++) {
        if (currentVotes[i].id == voteID) {
            logger.info(`removing project ${project} vote ${voteID}`)
            removedVote = true
            continue
        }
        updatedVotes.push(currentVotes[i])
    }

    // save the updated vote list if updated
    if (removedVote) {
        logger.info(`updating project ${project} votes ${JSON.stringify(updatedVotes)}`)
        return await write(getVoteFilePath(project), JSON.stringify(updatedVotes))
    }
    return false
}

// creates a new project vote
export async function createVote(project: string, title: string, expiryTime: number, requiredRoles: any, choices: any) {
    var currentVotes = await getAllProjectVotes(project)
    var newVoteChoices: any = []
    var newVote = {
        id: Date.now(),
        title: title,
        expiryTime: expiryTime,
        requiredRoles: requiredRoles,
        choices: newVoteChoices,
        votes: 0
    }
    for (var i = 0; i < choices.length; i++) {
        newVote.choices.push({
            value: choices[i],
            count: 0
        })
    }
    currentVotes.push(newVote)
    logger.info(`saving project ${project} vote: ${JSON.stringify(currentVotes)}`)
    return await write(getVoteFilePath(project), JSON.stringify(currentVotes))
}

// retrieves all project votes
export async function getProjectVotesForUser(project: string, publicKey: string) {

    // validate project exists
    const config = await getConfig(project)
    if (!config) {
        logger.info(`project does not exist: ${project}`)
        return []
    }

    // validate user owns the project
    var isProjectOwner = false
    try {
        var userProject = JSON.parse(await read(getPublicKeyFilePath(publicKey)))
        isProjectOwner = userProject && userProject.projectName == project
    } catch (e) {
        logger.info("user does not own project")
    }

    // ensure user has valid role in this project
    var verifiedHolder = await getHodlerRolesWithFallback(project, publicKey, config)
    var verifiedRoles = verifiedHolder.roles
    if (verifiedRoles.length == 0) {
        logger.info("user not verified: " + publicKey)
        return false
    }

    // retrieve all the available votes
    var allVotes = await getAllProjectVotes(project)

    // post processing results for project vote configurations
    var returnVotes: any = []
    for (var i = 0; i < allVotes.length; i++) {
        try {

            // is user enabled to view the vote
            if (!isUserEligible(verifiedRoles, allVotes[i].requiredRoles)) {
                logger.info(`user ${publicKey} not authorized to access vote`)
                continue
            }

            // inspect the vote results
            var voteResultsStr = await read(getVoteResultsFilePath(project, allVotes[i].id))
            if (voteResultsStr) {
                var voteResults = JSON.parse(voteResultsStr)
                if (voteResults && voteResults.user && voteResults.mint) {

                    // determine user's vote for each entry
                    var userResult = voteResults.user[publicKey]
                    if (userResult) {
                        for (var j = 0; j < allVotes[i].choices.length; j++) {
                            if (allVotes[i].choices[j].value == userResult.vote) {
                                logger.info(`found user ${publicKey} vote results for ${allVotes[i].id}, index=${j}`)
                                allVotes[i].responded = j
                                break
                            }
                        }
                    }

                    // determine overall results for each entry
                    Object.keys(voteResults.mint).forEach(key => {
                        allVotes[i].votes++
                        if (allVotes[i].expiryTime > Date.now()) {
                            return
                        }
                        for (var j = 0; j < allVotes[i].choices.length; j++) {
                            if (allVotes[i].choices[j].value == voteResults.mint[key]) {
                                allVotes[i].choices[j].count++
                            }
                        }
                    })
                }
            }

            // if user is owner and not yet any votes allow delete
            allVotes[i].isMutable = false
            if (allVotes[i].votes == 0 && isProjectOwner) {
                logger.info(`allowing owner to remove vote for ${allVotes[i].id}`)
                allVotes[i].isMutable = true
            }

            // if vote is expired and there were no results do not show
            if (allVotes[i].expiryTime < Date.now() && allVotes[i].votes == 0) {
                logger.info(`vote ${allVotes[i].id} has expired with no votes`)
                continue
            }

            // add vote to list
            returnVotes.push(allVotes[i])
        } catch (e) {
            logger.info("error reading vote result file", e)
        }
    }

    // sort by vote expiry time
    returnVotes.sort((b: any, a: any) => (a.expiryTime > b.expiryTime) ? 1 : (b.expiryTime > a.expiryTime) ? -1 : 0)

    // votes successfully retrieved
    return returnVotes
}

// retrieves a specific project vote by ID
export async function getProjectVote(project: string, id: string, publicKey: string) {
    var allVotes = await getProjectVotesForUser(project, publicKey)
    for (var i = 0; i < allVotes.length; i++) {
        if (allVotes[i].id == id) {
            return allVotes[i]
        }
    }
    return null
}
