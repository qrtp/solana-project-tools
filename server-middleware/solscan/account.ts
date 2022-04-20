import axios from 'axios';
import { AsyncSemaphore } from '../concurrent/semaphore';
import { sleep } from '../verify/util';
const loggerWithLabel = require('../logger/structured')

//configure logging
const logger = loggerWithLabel("solscan")

// default solscan query endpoint
var solscanURL = "https://public-api.solscan.io"

// create HTTP client with 60 second timeout
const axiosInstance = axios.create()
axiosInstance.defaults.timeout = 60000

// create semaphore for system wide calls to solscan
const maxSolscanRequests = 5
const solscanQueue = new AsyncSemaphore(maxSolscanRequests)

// retrieves the last transaction ID for given wallet
export async function getLastTransaction(walletID: string) {

    // value that will be returned
    var fetchValue = ""

    // fetch method that will be scheduled on queue
    const fetch = async function () {
        let url = `${solscanURL}/account/transactions?limit=1&account=${walletID}`
        try {
            logger.info(`retrieving last transaction for wallet ${walletID} from ${url}`)
            let res = await axiosInstance.get(url)
            if (res.data && res.data.length > 0) {
                for (let tx of res.data) {
                    logger.info(`located last transaction for wallet ${walletID}: ${tx.txHash}`)
                    fetchValue = tx.txHash
                    return
                }
            }
        } catch (e) {
            logger.info(`ERROR: ${e.code} - ${e.message}`)
        } finally {
            // sleep to enforce rate limiting against the solscan
            // API endpoint
            await sleep(1)
        }
        logger.info(`unable to find last tx for wallet ${walletID}`)
        fetchValue = ""
    }

    // schedule and wait for completion
    await solscanQueue.withLockRunAndForget(() => fetch())
    await solscanQueue.awaitTerminate()
    return fetchValue
}
