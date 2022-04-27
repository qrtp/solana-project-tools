import { list, read, remove } from '../storage/persist'
import { getConfigFilePath, getHodlerFilePath, getPublicKeyFilePath, getSalesAuditFilePath, getSalesFilePath, getVoteFilePath } from '../verify/paths'
const loggerWithLabel = require('../logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("project")

// retrieve configuration from filesystem
export async function getConfig(name: any) {
    try {
        var contents = await read(getConfigFilePath(name))
        return JSON.parse(contents)
    } catch (e) {
        logger.info("error reading file", e)
    }
    return null
}

// retrieves list of all projects
export async function getAllProjects() {
    var projectNames = []
    var projectIDs = await list("./config", "prod")
    for (var i = 0; i < projectIDs.length; i++) {
        var project = projectIDs[i]?.replaceAll("./", "").replaceAll("config/prod-", "").replaceAll(".json", "")
        if (project) {
            projectNames.push(project)
        }
    }
    return projectNames
}

// removes a project by name
export async function removeProject(name: any) {

    try {

        // retrieve the project config
        var config = await getConfig(name)
        if (!config) {
            logger.info(`project not found: ${name}`)
            return false
        }

        // extract data we need for the delete
        var updateAuthority = config.update_authority
        if (!updateAuthority || updateAuthority == "") {
            logger.info(`unable to find update authority for ${name}`)
            return false
        }
        var ownerPublicKey = config.owner_public_key
        if (!ownerPublicKey || ownerPublicKey == "") {
            logger.info(`unable to find ownder public key for ${name}`)
            return false
        }

        // log what we are about to remove
        logger.info(`removing project ${name} with owner key ${ownerPublicKey} and update authority ${updateAuthority}`)

        // remove all voting entries
        var voteResults = await list("./config", `vote-results-${name}-`)
        for (var i = 0; i < voteResults.length; i++) {
            await remove(voteResults[i])
        }

        // remove all associated files
        await remove(getConfigFilePath(name))
        await remove(getHodlerFilePath(name))
        await remove(getVoteFilePath(name))
        await remove(getSalesFilePath(ownerPublicKey))
        await remove(getSalesAuditFilePath(ownerPublicKey))
        await remove(getPublicKeyFilePath(ownerPublicKey))
        return true
    } catch (e) {
        logger.info(`error removing project ${name}`, e)
    }
    return false
}

// retreives the current hodler list in JSON format
export async function getHodlerList(name: any) {
    var hodlerListStr = await read(getHodlerFilePath(name))
    return JSON.parse((hodlerListStr != "") ? hodlerListStr : "[]")
} 
