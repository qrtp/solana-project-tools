
const axios = require('axios')
const { base58_to_binary } = require('base58-js')
import { getDiscordClient } from '../discord/client'
import { getLastTransaction } from '../solscan/account'
import { write } from '../storage/persist'
import { getConfigFilePath, getHodlerFilePath } from '../verify/paths'
import { getConfig, getHodlerList } from '../verify/project'
const { getParsedNftAccountsByOwner } = require('@nfteyez/sol-rayz')
const nacl = require('tweetnacl')
const { PublicKey } = require('@solana/web3.js')
const loggerWithLabel = require('../logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("holder")

/**
 * Create HTTP client with 60 second timeout
 */
const defaultHttpTimeout = 60000

// validates signature of a given message
export function isSignatureValid(publicKeyString: string, signature: any, message: any) {
    logger.info(`validating signagure ${signature} for public key ${publicKeyString}`)
    const encodedMessage = new TextEncoder().encode(message)
    let publicKey = new PublicKey(publicKeyString).toBytes()
    const encryptedSignature = base58_to_binary(signature)
    return nacl.sign.detached.verify(encodedMessage, encryptedSignature, publicKey)
}

// attempts to retrieve previously stored roles and falls back to on-chain query if no roles
// can be found locally
export async function getHodlerRolesWithFallback(project: string, walletAddress: string, config: any) {
    var roles = await getHolderStoredRoles(project, walletAddress)
    if (!roles || roles.length == 0) {
        roles = await getHodlerRoles(walletAddress, config)
    }
    return roles
}

// determines holder roles from previously stored values
export async function getHolderStoredRoles(project: string, walletAddress: string) {
    var roles: any = []
    try {
        var hodlerList = await getHodlerList(project)
        for (let n of hodlerList) {
            if (n.publicKey == walletAddress) {
                logger.info(`found stored roles for user ${walletAddress}: ${JSON.stringify(n.roles)}`)
                roles = n.roles
                break
            }
        }
    } catch (e) {
        logger.info("error retrieving holder roles", e)
    }
    return roles
}

// determines if the holder is verified
export async function getHodlerRoles(walletAddress: string, config: any) {

    // retrieve the required roles for this project
    var startTime = Date.now()
    var projectRoles = await getRequiredRoles(config)
    var userRoleMap = new Map<any, boolean>()
    logger.info(`checking wallet ${walletAddress} roles against project roles ${JSON.stringify(projectRoles)}`)

    // determine if the wallet is valid for each role
    var wallet = await getHodlerWallet(walletAddress, config)
    for (var i = 0; i < projectRoles.length; i++) {

        // asssume not verified until determined otherwise
        var projectRole = projectRoles[i]
        var roleVerified = false

        // validate on SPL balance if specified
        if (projectRole.splBalance > 0) {
            var splBalance = wallet.splBalance || 0
            if (splBalance >= projectRole.splBalance) {
                logger.info(`wallet ${walletAddress} validated for role ${projectRole.roleID} via SPL balance`)
                roleVerified = true
            }
        }

        // if present, determine the number of NFTs match the required attributes
        if (projectRole.nftBalance > 0 && wallet.nfts) {
            var walletNFTCount = wallet.nfts.length
            var matchingNFTCount = walletNFTCount
            if (projectRole.nftAttributes.length > 0) {
                matchingNFTCount = 0
                projectRole.nftAttributes.forEach(requiredAttribute => {
                    for (var j = 0; j < walletNFTCount; j++) {
                        var walletNFT = (wallet.nfts) ? wallet.nfts[j] : undefined
                        logger.info(`checking wallet ${walletAddress} NFT ${JSON.stringify(walletNFT)} for required attribute ${JSON.stringify(requiredAttribute)}`)
                        if (walletNFT?.attributes) {
                            for (var k = 0; k < walletNFT.attributes.length; k++) {
                                var walletNFTAttribute = walletNFT.attributes[k]
                                if ([walletNFTAttribute.trait_type, "*"].includes(requiredAttribute.key)) {
                                    if ([walletNFTAttribute.value, "*"].includes(requiredAttribute.value)) {
                                        logger.info(`wallet ${walletAddress} matches requirement ${JSON.stringify(requiredAttribute)}`)
                                        matchingNFTCount++
                                        break
                                    }
                                }
                            }
                        }
                    }
                })
            }

            // verify the required number of NFT matches has been met
            if (matchingNFTCount >= projectRole.nftBalance) {
                logger.info(`wallet ${walletAddress} validated for role ${projectRole.roleID} via matching NFT count. Required=${projectRole.nftBalance}, found=${matchingNFTCount}`)
                roleVerified = true
            }
        }

        // set the role verification result
        if (!userRoleMap.get(projectRole.roleID)) {
            userRoleMap.set(projectRole.roleID, roleVerified)
        }
    }

    // create a list of only validated role IDs
    var userRoles = []
    for (const roleID of userRoleMap.keys()) {
        if (userRoleMap.get(roleID)) {
            userRoles.push(roleID)
        }
    }
    var elapsedTime = Date.now() - startTime
    logger.info(`wallet ${walletAddress} has roles ${JSON.stringify(userRoles)} (${elapsedTime}ms)`)
    return userRoles
}

// validates the current holders are still in good standing
export async function reloadHolders(project: any) {

    // raed only made flag to log destructive changes but not write them
    var readOnly = process.env.DISABLE_REMOVE_ROLES == "true"
    if (readOnly) {
        logger.info(`reloading project ${project} in read-only mode`)
    } else {
        logger.info(`reloading project ${project} in write mode`)
    }

    // retrieve config and ensure it is valid
    const config = await getConfig(project)
    if (!config) {
        return 404
    }

    // only allow reload on given interval
    var reloadIntervalMillis = parseInt((process.env.RELOAD_INTERVAL_MINUTES) ? process.env.RELOAD_INTERVAL_MINUTES : "0") * 60 * 1000
    var lastReloadMillis = (config.lastReload) ? config.lastReload : 0
    var lastReloadElapsed = Date.now() - lastReloadMillis
    logger.info(`last reload was ${lastReloadElapsed}ms ago`)
    if (lastReloadElapsed < reloadIntervalMillis) {
        logger.info(`reload not yet required`)
        return 200
    }

    // retrieve discord client
    var startTime = Date.now()
    const client = await getDiscordClient(project)
    if (!client) {
        return 400
    }

    // some general statistics
    var metrics = {
        added: 0,
        removed: 0,
        skipped: 0,
        unchanged: 0,
        error: 0
    }

    // iterate the hodler list
    var updatedHodlerList: any[] = []
    var hodlerList = await getHodlerList(project)
    for (let n in hodlerList) {

        // the holder to revalidate
        const holder = hodlerList[n]

        try {

            // retrieve last transaction ID
            var lastTx = await getLastTransaction(holder.publicKey)
            if (holder.lastTx == lastTx) {
                logger.info(`holder ${JSON.stringify(holder)} already processed last tx ${lastTx}`)
                updatedHodlerList.push(holder)
                metrics.skipped++
                continue
            }

            // determine currently held roles
            var verifiedRoles = await getHodlerRoles(holder.publicKey, config)

            // determine roles to add
            var rolesToAdd: any[] = []
            verifiedRoles.forEach(verifiedRole => {
                var foundRole = false
                if (holder.roles) {
                    holder.roles.forEach((holderRole: any) => {
                        if (holderRole == verifiedRole) {
                            foundRole = true
                        }
                    })
                }
                if (!foundRole) {
                    rolesToAdd.push(verifiedRole)
                }
            })

            // determine roles to remove
            var rolesToRemove: any[] = []
            if (holder.roles) {
                holder.roles.forEach((holderRole: any) => {
                    var foundRole = false
                    verifiedRoles.forEach(verifiedRole => {
                        if (holderRole == verifiedRole) {
                            foundRole = true
                        }
                    })
                    if (!foundRole) {
                        rolesToRemove.push(holderRole)
                    }
                })
            }

            // update the user's roles
            if (rolesToAdd.length > 0 || rolesToRemove.length > 0) {

                // audit log for what changes are going to be made
                logger.info(`holder ${JSON.stringify(holder)} updating roles, add=${JSON.stringify(rolesToAdd)}, remove=${JSON.stringify(rolesToRemove)}`)

                // parse the discord address to remove
                hodlerList.splice(n, 1)
                const username = holder.discordName.split('#')[0]
                const discriminator = holder.discordName.split('#')[1]

                // retrieve server and user records from discord
                const myGuild = await client.guilds.cache.get(config.discord_server_id)
                if (!myGuild) {
                    logger.info(`holder ${JSON.stringify(holder)} error retrieving server information`)
                    continue
                }
                const doer = await myGuild.members.cache.find((member: any) => (member.user.username === username && member.user.discriminator === discriminator))
                if (!doer) {
                    logger.info(`holder ${JSON.stringify(holder)} error retrieving user information`)
                    continue
                }

                // remove the roles that are no longer valid
                for (var i = 0; i < rolesToRemove.length; i++) {
                    const role = await myGuild.roles.cache.find((r: any) => r.id === rolesToRemove[i])
                    if (!role) {
                        logger.info(`holder ${JSON.stringify(holder)} error retrieving role information ${JSON.stringify(rolesToRemove[i])}`)
                        continue
                    }
                    logger.info(`holder ${JSON.stringify(holder)} removing role ${rolesToRemove[i]} on server ${config.discord_server_id}`)
                    if (!readOnly) {
                        await doer.roles.remove(role)
                    }
                    metrics.removed++
                }

                // add the roles that are missing
                for (var i = 0; i < rolesToAdd.length; i++) {
                    const role = await myGuild.roles.cache.find((r: any) => r.id === rolesToAdd[i])
                    if (!role) {
                        logger.info(`holder ${JSON.stringify(holder)} error retrieving role information`)
                        continue
                    }
                    logger.info(`holder ${JSON.stringify(holder)} adding role ${rolesToAdd[i]} on server ${config.discord_server_id}`)
                    await doer.roles.add(role)
                    metrics.added++
                }
            } else {
                // no changes required for this user
                logger.info(`no changes required for holder ${JSON.stringify(holder)} revalidation `)
                metrics.unchanged++
            }

            // update the holder list to include only the verified roles. If there are not any
            // verified roles then do not include the holder in the updated list at all.
            if (verifiedRoles.length > 0) {
                holder.roles = verifiedRoles
                holder.lastTx = lastTx
                logger.info(`updating holder list with user ${JSON.stringify(holder)} with verified roles ${JSON.stringify(verifiedRoles)}`)
                updatedHodlerList.push(holder)
            } else {
                logger.info(`holder no longer has any roles ${JSON.stringify(holder)}`)
            }
        } catch (holderErr) {
            logger.info(`error revalidating holder ${JSON.stringify(holder)}`, holderErr)
            metrics.error++
        }
    }

    // update the config with current timestamp
    config.lastReload = Date.now()
    await write(getConfigFilePath(project), JSON.stringify(config))

    // update the hodler file and return successfully
    if (!readOnly) {
        logger.info(`updating ${project} holder list with ${updatedHodlerList.length} users`)
        await write(getHodlerFilePath(project), JSON.stringify(updatedHodlerList))
    }

    // write elapsed time and continue
    var reloadElapsed = Date.now() - startTime
    logger.info(`reloaded roles for ${project} in ${reloadElapsed}ms with results ${JSON.stringify(metrics)}`)
    return 200
}

// retrieves the token balance
async function getTokenBalance(walletAddress: any, tokenMintAddress: any) {
    const response = await axios({
        url: `https://api.mainnet-beta.solana.com`,
        method: "post",
        headers: { "Content-Type": "application/json" },
        timeout: defaultHttpTimeout,
        data: {
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
                walletAddress,
                {
                    mint: tokenMintAddress,
                },
                {
                    encoding: "jsonParsed",
                },
            ],
        },
    });
    if (
        Array.isArray(response?.data?.result?.value) &&
        response?.data?.result?.value?.length > 0 &&
        response?.data?.result?.value[0]?.account?.data?.parsed?.info?.tokenAmount
            ?.amount > 0
    ) {
        return (
            Number(
                response?.data?.result?.value[0]?.account?.data?.parsed?.info
                    ?.tokenAmount?.amount
            ) / 1000000
        );
    } else {
        return 0;
    }
};

async function getTokenAttributes(uri: any) {
    try {
        const response = await axios({
            url: uri,
            method: "get",
            timeout: defaultHttpTimeout,
        })
        return response.data.attributes
    } catch (e) {
        logger.info(`error getting token attributes on ${uri}`, e)
    }
    return [{ "trait_type": "trait_type_default", "value": "trait_type_value" }]
}

// determines the list of roles required by a project
async function getRequiredRoles(config: any) {

    // default NFT balance role
    var nftAttributes: any[] = []
    var projectRoles = []
    projectRoles.push({
        roleID: config.discord_role_id,
        splBalance: 0,
        nftBalance: 1,
        nftAttributes: nftAttributes
    })

    // default SPL token balance role
    projectRoles.push({
        roleID: config.discord_role_id,
        splBalance: 1,
        nftBalance: 0,
        nftAttributes: nftAttributes
    })

    // holder only access to trait based role assignment
    if (config.is_holder && config.roles) {
        config.roles.forEach((role: any) => {
            projectRoles.push({
                roleID: role.discord_role_id,
                splBalance: 0,
                nftBalance: role.required_balance,
                nftAttributes: [{
                    key: role.key,
                    value: role.value
                }]
            })
        })
    }

    logger.info(`required roles are ${JSON.stringify(projectRoles)}`)
    return projectRoles
}

// method to sleep for N seconds
function sleep(n: number) {
    return new Promise(function (resolve) {
        setTimeout(resolve, n * 1000);
    });
}

// choose a random number between two values
function randomIntFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

// inspects a holder's wallet for NFTs and SPL tokens matching the criteria
// specified in the config map
export async function getHodlerWallet(walletAddress: string, config: any) {

    // initialize an empty wallet to be returned
    let nfts: any[] = [];
    let wallet = {
        nfts: nfts,
        splBalance: 0
    }

    // Parses all tokens from the requested wallet address public key
    let tokenList
    var maxRetries = 10
    for (var i = 0; i < maxRetries; i++) {
        try {
            tokenList = await getParsedNftAccountsByOwner({ publicAddress: walletAddress })
            break
        } catch (e) {
            var retryNumber = i + 1
            if (retryNumber >= maxRetries) {
                logger.info(`wallet ${walletAddress} failed to load after ${retryNumber} retries`)
                throw e
            }
            var backoffSeconds = retryNumber * randomIntFromInterval(1, 5)
            logger.info(`error retrieving wallet ${walletAddress}, retry ${retryNumber} in ${backoffSeconds} seconds`, e)
            await sleep(backoffSeconds)
        }
    }

    // determine list of valid update authorities
    var updateAuthorityList = [config.update_authority]
    var splTokenList: any[] = []
    if (config.spl_token) {
        splTokenList = config.spl_token.split(",")
        splTokenList.forEach((ua: any) => {
            updateAuthorityList.push(ua)
        })
    }

    // populate the items in the wallet
    if (tokenList) {

        // concurrency control
        var maxConcurrentMetadata = 25
        var promises = []

        // iterate the available tokens for this wallet
        for (let item of tokenList) {
            if (updateAuthorityList.includes(item.updateAuthority)) {

                // schedule to the concurrent queue
                promises.push(async function () {
                    logger.info(`wallet ${walletAddress} item ${item.mint} matches an expected update authority (${JSON.stringify(updateAuthorityList)})`)
                    if (config.roles && config.roles.length > 0 && config.is_holder) {
                        logger.info(`wallet ${walletAddress} retrieving token metadata for ${item.mint}`)
                        item.attributes = await getTokenAttributes(item.data.uri)
                    } else {
                        logger.info(`skipping wallet ${walletAddress} token metadata for ${item.mint}`)
                    }
                    logger.info(`wallet ${walletAddress} adding item to wallet ${JSON.stringify(item)}`)
                    wallet.nfts.push(item)
                }())

                // throttle concurrency
                if (promises.length == maxConcurrentMetadata) {
                    logger.info(`wallet ${walletAddress} waiting for ${promises.length} NFTs to complete processing`)
                    await Promise.all(promises)
                    promises = []
                }
            }
        }

        // wait for queue to complete
        logger.info(`wallet ${walletAddress} waiting for ${promises.length} remaining NFTs to complete processing`)
        await Promise.all(promises)
    }

    // if specified in the config, check for SPL token balance
    if (splTokenList) {
        for (var i = 0; i < splTokenList.length; i++) {
            try {
                wallet.splBalance = await getTokenBalance(walletAddress, splTokenList[i])
                logger.info(`wallet ${walletAddress} spl token ${splTokenList[i]} balance: ${wallet.splBalance}`)
            } catch (e) {
                logger.info("Error getting spl token balance", e)
            }
        }
    }

    // return the wallet object
    return wallet
}

