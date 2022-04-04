import { list, read } from '../storage/persist'
import { getConfigFilePath, getHodlerFilePath } from '../verify/paths'
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

// retreives the current hodler list in JSON format
export async function getHodlerList(name: any) {
    var hodlerListStr = await read(getHodlerFilePath(name))
    return JSON.parse((hodlerListStr != "") ? hodlerListStr : "[]")
} 
