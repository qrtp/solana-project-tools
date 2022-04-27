
const { Client, Intents } = require('discord.js')
const loggerWithLabel = require('../logger/structured')
import { getConfig } from '../verify/project'

/**
 * Configure logging
 */
const logger = loggerWithLabel("discord")

// Cache of discord clients available on this server
const discordClients = new Map<any, any>()

// Retrieve the name of a discord role with given ID
export async function getRoleName(projectName: any, roleID: any) {

    // retrieve existing config if available
    logger.info(`retrieving role name for ID ${roleID} in project ${projectName}`)
    var config = await getConfig(projectName)
    const client = discordClients.get(projectName)
    if (!client) {
        logger.info(`unable to get client for ${projectName}`)
        return ""
    }

    // retrieve the server
    const myGuild = await client.guilds.cache.get(config.discord_server_id)
    if (!myGuild) {
        logger.info(`unable to retrieve server ${config.discord_server_id} in project ${projectName}`)
        return ""
    }

    // retrieve the role name
    const role = await myGuild.roles.cache.find((r: any) => r.id === roleID)
    if (!role) {
        logger.info(`unable to retrieve role ID ${roleID} on server ${config.discord_server_id} in project ${projectName}`)
        return ""
    }

    // return the role name
    logger.info(`found role name ${role.name} for ID ${roleID} in project ${projectName}`)
    return role.name
}

// Lazy load clients as required
export async function getDiscordClient(projectName: any) {

    // retrieve existing config if available
    const existingClient = discordClients.get(projectName)
    if (existingClient) {
        logger.info(`found existing discord client: ${projectName}`)
        return existingClient
    }

    // get the config
    var config = await getConfig(projectName)

    // create a new client instance
    let allIntents = new Intents()
    allIntents.add(Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGES)
    const newClient = new Client({ intents: allIntents });

    // listen for bot commands if enabled
    if (process.env.ENABLE_BOT_COMMANDS) {
        let prefix = "!";
        let redirect_url = config.discord_redirect_url;
        newClient.on("messageCreate", (message: { content: { startsWith: (prefix: string) => boolean }, channel: any, author: any, }) => {

            // Exit and stop if the prefix is not there or if user is a bot
            if (!message.content.startsWith(prefix) || message.author.bot) return;

            // only process !verify commands
            if (message.content.startsWith(`${prefix}verify`)) {

                // send the verification message to user
                message.channel.send(`Hi ${message.author}! Visit ${redirect_url} to gain your special NFT holder role.`);
            }
        });
    }

    try {
        // login to the client
        newClient.login(config.discord_bot_token);

        // wait for client to be ready
        logger.info(`waiting for ${projectName} client to initialize`)
        for (var i = 0; i < 25; i++) {
            if (await newClient.guilds.cache.get(config.discord_server_id)) {
                logger.info(`${projectName} client is ready!`)

                // store the global config
                logger.info(`adding new discord client: ${projectName}`)
                discordClients.set(projectName, newClient)
                return newClient
            }
            await new Promise(r => setTimeout(r, 500));
        }
    } catch (e) {
        logger.info(`error logging into ${projectName} client`, e)
    }

    // getting here means an error
    logger.info(`client ${projectName} was not initialized`)
    return null
}
