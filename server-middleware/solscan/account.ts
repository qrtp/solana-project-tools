import axios from 'axios';
const loggerWithLabel = require('../logger/structured')

//configure logging
const logger = loggerWithLabel("solscan")

// default solscan query endpoint
var solscanURL = "https://public-api.solscan.io"

// create HTTP client with 60 second timeout
const axiosInstance = axios.create()
axiosInstance.defaults.timeout = 60000

// retrieves the last transaction ID for given wallet
export async function getLastTransaction(walletID: string) {
    let url = `${solscanURL}/account/transactions?limit=1&account=${walletID}`
    try {
        logger.info(`retrieving last transaction for wallet ${walletID} from ${url}`)
        let res = await axiosInstance.get(url)
        if (res.data && res.data.length > 0) {
            for (let tx of res.data) {
                logger.info(`located last transaction for wallet ${walletID}: ${tx.txHash}`)
                return tx.txHash
            }
        }
    } catch (e) {
        logger.info(`ERROR: ${e.code} - ${e.message}`)
    }
    logger.info(`unable to find last tx for wallet ${walletID}`)
    return ""
}