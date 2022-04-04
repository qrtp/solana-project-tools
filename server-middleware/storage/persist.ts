import { initializeCOS, listCOSFiles, readCOSFile, useCOS, writeCOSFile } from "./ibm-cos";

const fs = require('fs')
const NodeCache = require("node-cache")
const loggerWithLabel = require('../logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("persist")

// write-through cache to ease traffic to COS layer. Default TTL
// of 10 minutes will purge old data.
const cosCache = new NodeCache({
    stdTTL: 600,
})

export function initializeStorage() {

    // enable COS bucket storage if present in config
    var cosConfigStr = (process.env.COS_CONFIG) ? process.env.COS_CONFIG : ""
    if (cosConfigStr != "") {
        var cosConfig = JSON.parse(cosConfigStr)
        initializeCOS({
            endpoint: cosConfig.endpoint,
            apiKey: cosConfig.apiKey,
            instanceID: cosConfig.instanceID,
            storageClass: cosConfig.storageClass,
            bucket: cosConfig.bucket
        })
    }
}

export async function list(directoryPath: string, filter: string) {
    logger.info(`listing files in directory ${directoryPath}`)
    if (useCOS()) {
        var filterString = `${directoryPath}/${filter}`.replaceAll("./", "")
        var cacheKey = `listcache-${filterString}`
        var cacheHit = cosCache.get(cacheKey)
        if (cacheHit) {
            logger.info(`cache hit listing files: ${filterString}`)
            return cacheHit
        }
        var listResults = await listCOSFiles(filterString)
        cosCache.set(cacheKey, listResults)
        logger.info(`retrieved new file list for: ${filterString}`)
        return listResults
    }
    try {
        var matchingFiles: string[] = []
        var filenames = fs.readdirSync(directoryPath)
        filenames.forEach((file: string) => {
            if (file.includes(filter)) {
                matchingFiles.push(file)
            }
        })
        return matchingFiles
    } catch (e) {
        logger.info("error listing files", e)
    }
    return []
}

export async function read(fileName: string) {
    logger.info(`reading from ${fileName}`)
    if (useCOS()) {

        // check the cache for hit
        var cacheHit = cosCache.get(fileName)
        if (cacheHit) {
            logger.info(`cache hit reading file: ${fileName}`)
            return cacheHit
        }
        var cosContents = await readCOSFile(fileName)
        var cosContentsToReturn = (cosContents) ? cosContents : ""
        cosCache.set(fileName, cosContentsToReturn)
        return cosContentsToReturn
    }
    try {
        var contents: string
        contents = fs.readFileSync(fileName, { encoding: 'utf8', flag: 'r' })
        return contents
    } catch (e) {
        logger.info("error reading file", e)
    }
    return ""
}

export async function write(fileName: string, contents: string) {
    logger.info(`writing to ${fileName}`)
    if (useCOS()) {
        cosCache.set(fileName, contents)
        return await writeCOSFile(fileName, contents)
    }
    try {
        fs.writeFileSync(fileName, contents)
        return true
    } catch (e) {
        logger.info("error writing file", e)
    }
    return false
}