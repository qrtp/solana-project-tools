import { read, write } from '../storage/persist'
import { getHodlerRolesWithFallback, getHodlerWallet } from '../verify/holder'
import { getVoteResultsFilePath } from '../verify/paths'
import { getConfig } from '../verify/project'
import { getProjectVote } from './project'
const loggerWithLabel = require('../logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("vote-user")

// determines if user is authorized to vote
export function isUserEligible(userRoles: any, requiredRoles: any) {
    var userAuthorized = false
    for (var i = 0; i < requiredRoles.length; i++) {
        for (var j = 0; j < userRoles.length; j++) {
            if (requiredRoles[i] == userRoles[j]) {
                logger.info(`user is authorized to vote via role ${userRoles[j]}`)
                userAuthorized = true
                break
            }
        }
    }
    return userAuthorized
}

// cast a project vote
export async function castVote(project: string, id: string, publicKey: string, vote: string) {

    // validate project exists
    logger.info(`casting ${project} vote for wallet ${publicKey}: ${id}=${vote}`)
    const config = await getConfig(project)
    if (!config) {
        logger.info(`project does not exist: ${project}`)
        return false
    }

    // check vote expiry time
    var voteConfig = await getProjectVote(project, id, publicKey)
    if (!voteConfig) {
        logger.info(`requested vote not found, project=${project}, id=${id}`)
        return false
    }
    if (voteConfig.expiryTime < Date.now()) {
        logger.info(`vote is already expired, project=${project}, id=${id}`)
        return false
    }

    // ensure user has valid role in this project
    var verifiedHolder = await getHodlerRolesWithFallback(project, publicKey, config)
    var verifiedRoles = verifiedHolder.roles
    if (verifiedRoles.length == 0) {
        logger.info("user not verified: " + publicKey)
        return false
    }

    // ensure user is authorized to vote
    var userAuthorized = isUserEligible(verifiedRoles, voteConfig.requiredRoles)
    if (!userAuthorized) {
        logger.info(`user ${publicKey} not authorized to vote, required=${JSON.stringify(voteConfig.requiredRoles)}`)
        return false
    }

    // query the project NFTs held in user wallet to determine vote count
    var wallet = await getHodlerWallet(publicKey, config)
    var voteCount = wallet.nfts.length

    // retrieve existing vote results
    var voteResults: any = {
        user: {},
        mint: {}
    }
    try {
        voteResults = JSON.parse(await read(getVoteResultsFilePath(project, id)))
    } catch (e) {
        logger.info("error reading vote results file", e)
    }

    // update vote results with user selection
    voteResults.user[publicKey] = {
        vote: vote,
        count: voteCount
    }
    for (var i = 0; i < voteCount; i++) {
        voteResults.mint[wallet.nfts[i].mint] = vote
    }

    // save the vote for current user
    if (!await write(getVoteResultsFilePath(project, id), JSON.stringify(voteResults))) {
        logger.info(`error saving user ${publicKey} vote results file`)
        return false
    }

    // success
    logger.info(`successfully cast vote ${id} for ${publicKey}, count=${voteCount}`)
    return true
}