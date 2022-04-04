
// Required libraries
import ibm from 'ibm-cos-sdk';
const loggerWithLabel = require('../logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("ibm-cos")

// global configuration values
var cos: ibm.S3
var bucketName: string
var storageClass: string

export function useCOS() {
    return cos != null
}

// writeCOSFile writes a file to a COS bucket
export async function writeCOSFile(fileName: string, contents: string) {
    return await createTextFile(bucketName, fileName, contents)
}

// readCOSFile reads contents of a file from COS bucket
export async function readCOSFile(fileName: string) {
    return await getItem(bucketName, fileName)
}

// listCOSFiles retrieves names of items matching a given string
export async function listCOSFiles(matchString: string) {
    var allBucketItems = await getBucketObjects(bucketName)
    var matchingBucketItems = []
    if (allBucketItems) {
        for (var i = 0; i < allBucketItems.length; i++) {
            if (allBucketItems[i].Key?.includes(matchString) || matchString == "") {
                matchingBucketItems.push(allBucketItems[i].Key)
            }
        }
    }
    return matchingBucketItems
}

// Determines if a given bucket exists
async function bucketExists(name: string) {
    try {
        const data = await cos.listBuckets().promise()
        if (data.Buckets != null) {
            for (var i = 0; i < data.Buckets.length; i++) {
                if (data.Buckets[i].Name == name) {
                    logger.info(`found bucket: ${name}`)
                    return true
                }
            }
        }
    } catch (e) {
        logError(e)
    }
    logger.info(`bucket not found: ${name}`)
    return false
}

// Creates a new bucket
async function createBucket(bucketName: string) {
    logger.info(`creating bucket: ${bucketName}`);
    try {
        await cos.createBucket({
            Bucket: bucketName,
            CreateBucketConfiguration: {
                LocationConstraint: storageClass
            },
        }).promise()
        return true
    } catch (e) {
        logError(e)
    }
    return false
}

// Lists all items in specified bucket
async function getBucketObjects(bucketName: string) {
    try {
        const data = await cos.listObjects({
            Bucket: bucketName,
        }).promise()
        return data.Contents
    } catch (e) {
        logError(e)
    }
    return []
}

// Creates a new text file
async function createTextFile(bucketName: string, itemName: string, fileText: string) {
    logger.info(`writing text file to bucket: ${bucketName}, ${itemName}`);
    try {
        await cos.putObject({
            Bucket: bucketName,
            Key: itemName,
            Body: fileText
        }).promise()
        return true
    } catch (e) {
        logError(e)
    }
    return false
}

// Retrieve a particular item from the bucket
async function getItem(bucketName: string, itemName: string) {
    logger.info(`retrieving text file from bucket: ${bucketName}, key: ${itemName}`);
    try {
        var data = await cos.getObject({
            Bucket: bucketName,
            Key: itemName
        }).promise()
        if (data.Body) {
            return Buffer.from(data.Body.toString()).toString()
        }
    } catch (e) {
        logError(e)
    }
    return null
}

// initCOS initializes COS instance
export async function initializeCOS(c: { endpoint: string, apiKey: string, instanceID: string, storageClass: string, bucket: string }) {
    logger.info(`configuring COS`)
    var config = {
        ibmAuthEndpoint: "https://iam.cloud.ibm.com/identity/token",
        signatureVersion: "iam",
        endpoint: c.endpoint,
        apiKeyId: c.apiKey,
        serviceInstanceId: c.instanceID
    };
    bucketName = c.bucket
    storageClass = c.storageClass
    cos = new ibm.S3(config);
    if (!await bucketExists(bucketName)) {
        return createBucket(bucketName)
    }
    return true
}

// Prints errors to console
function logError(e: any) {
    logger.info(`ERROR: ${e.code} - ${e.message}\n`);
}