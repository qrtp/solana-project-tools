const bodyParser = require('body-parser')
const app = require('express')()
import { Request, Response } from 'express'
import { getDiscordClient } from './discord/client'
import morganMiddleware from './logger/morgan'
import { initializeStorage, read, write } from './storage/persist'
import { getHodlerRoles, isSignatureValid, reloadHolders } from './verify/holder'
import { getConfigFilePath, getHodlerFilePath, getPublicKeyFilePath, getRevalidationSuccessPath, getSalesFilePath, getSalesTrackerLockPath, getSalesTrackerSuccessPath } from './verify/paths'
import { getAllProjects, getConfig, getHodlerList } from './verify/project'
import { getFieldValue, toCamelCase } from './verify/util'
import { createVote, deleteVote, getProjectVotesForUser } from './vote/project'
import { castVote } from './vote/user'
const loggerWithLabel = require('./logger/structured')

/**
 * Configure logging
 */
const logger = loggerWithLabel("api")
const defaultRedactedString = "content-redacted"


/**
   * Configure storage layer
   */
initializeStorage()


/**
 * Choose processing mode
 */
if (process.env.REVALIDATION_MODE == "true") {
  const revalidate = async function () {

    // start timestamp for monitoring
    var startTimestamp = Date.now()

    try {

      // concurrency control
      var maxConcurrentProjects = 1
      var promises = []

      // load projets and validate holders 
      logger.info("loading all projects for holder revalidation")
      var allProjects = await getAllProjects()
      logger.info("retrieved projects", allProjects.length)
      for (var i = 0; i < allProjects.length; i++) {

        // schedule to the concurrent queue
        promises.push(async function () {
          try {
            logger.info(`validating project holders: ${allProjects[i]}`)
            await reloadHolders(allProjects[i])
          } catch (e1) {
            logger.info(`error reloading project ${allProjects[i]}`, e1)
          }
        }())

        // throttle concurrency
        if (promises.length == maxConcurrentProjects) {
          logger.info(`waiting for ${promises.length} projects to complete`)
          await Promise.all(promises)
          promises = []
        }
      }

      // wait for queue to complete
      logger.info(`waiting for ${promises.length} remaining projects to complete`)
      await Promise.all(promises)
    } catch (e2) {
      logger.info("error retrieving project list", e2)
    }

    // exit the program
    var elapsed = Date.now() - startTimestamp
    logger.info(`holder revalidation completed in ${elapsed}ms`)
    await write(getRevalidationSuccessPath(), Date.now().toString())
    process.exit(0)
  }

  // execute the batch revalidation
  revalidate()
}

/**
 * Configure session management for select endpoints
 */
const sessionMiddleware = require('express-session')({
  secret: process.env.TWITTER_SESSION_SECRET,
  name: "verification.sid",
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: 'auto',
  },
})


/**
 * API endpoint implementation
 */

// Configure the middleware to parse JSON
app.use(bodyParser.json())
app.use(morganMiddleware)

// Endpoint to retrieve a previously connected wallet session
app.get('/getConnectedWallet', sessionMiddleware, (req: any, res: Response) => {
  if (req.session) {
    if (req.session.publicKey && req.session.signature) {
      logger.info(`found connected wallet address ${req.session.publicKey}`)
      return res.json({
        publicKey: req.session.publicKey,
        signature: req.session.signature
      })
    }
  }
  return res.sendStatus(401)
})

// Endpoint to disconnect a wallet from session
app.get('/disconnectWallet', sessionMiddleware, (req: any, res: Response) => {
  if (req.session) {
    logger.info(`disonnecting wallet address ${req.session.publicKey}`)
    req.session.destroy(function (err: any) {
      if (err) {
        logger.info("unable to disconnect session", err)
      }
    })
  }
  return res.sendStatus(200)
})

// Endpoint to connect a wallet to session
app.post('/connectWallet', sessionMiddleware, (req: any, res: Response) => {

  // Validates signature sent from client
  var publicKeyString = req.body.publicKey
  logger.info(`connecting wallet with public key ${publicKeyString} signature ${req.body.signature}`)
  if (!isSignatureValid(publicKeyString, req.body.signature, process.env.MESSAGE)) {
    logger.info(`signature invalid for public key ${publicKeyString}`)
    return res.sendStatus(400)
  }

  // save in session
  if (req.session) {
    logger.info(`connecting wallet with key ${publicKeyString}`)
    req.session.publicKey = publicKeyString
    req.session.signature = req.body.signature
  }
  return res.sendStatus(200)
})

// Endpoint to get a project
app.get('/getProject', async (req: Request, res: Response) => {
  try {

    // use project query string value if present
    var projectName = req.query["project"]
    if (!projectName || projectName == "") {
      var userProject = JSON.parse(await read(getPublicKeyFilePath(req.query["publicKey"])))
      projectName = userProject.projectName
    }

    // retrieve project config
    var config = await getConfig(projectName)
    if (!config) {
      return res.sendStatus(404)
    }

    // remove sensitive data
    var returnConfig = {
      project: projectName,
      project_friendly_name: config.project_friendly_name,
      project_twitter_name: config.project_twitter_name,
      project_website: config.project_website,
      is_holder: config.is_holder,
      discord_url: config.discord_url,
      discord_client_id: config.discord_client_id,
      discord_server_id: config.discord_server_id,
      discord_role_id: config.discord_role_id,
      discord_roles: config.roles,
      discord_redirect_url: config.discord_redirect_url,
      update_authority: config.update_authority,
      spl_token: config.spl_token,
      royalty_wallet_id: config.royalty_wallet_id,
      verifications: config.verifications,
      message: config.message,
      discord_webhook: defaultRedactedString,
      discord_bot_token: defaultRedactedString,
      connected_twitter_name: config.connected_twitter_name
    }

    // return the configuration
    return res.json(returnConfig)
  } catch (e) {
    logger.info("error retrieving project", e)
    return res.sendStatus(404)
  }
})

// Endpoint to get all project sales
app.get('/getProjectSales', async (req: Request, res: Response) => {
  try {
    var config = await getConfig(req.query["project"])
    if (!config) {
      return res.sendStatus(404)
    }
    return res.json(JSON.parse(await read(getSalesFilePath(config.update_authority))))
  } catch (e) {
    logger.info("error querying project sales", e)
    return res.json([])
  }
})

// Endpoint to get all holders for given project
app.get('/getProjectHolders', async (req: Request, res: Response) => {
  var config = await getConfig(req.query["project"])
  if (config) {
    return res.json(await getHodlerList(req.query["project"]))
  }
  return res.sendStatus(404)
})

// Endpoint to retrieve all known projects
app.get('/getProjects', async (req: Request, res: Response) => {

  // concurrency control
  var maxConcurrentProjects = 10
  var promises = []

  // initialize project information
  var allProjects = await getAllProjects()
  var projectData: any[] = []
  var aggregateData: any = {
    projects: {
      active: 0,
      all: allProjects.length,
      holder: 0
    },
    sales: 0,
    verifications: 0,
    tracker: {
      inProgress: 0,
      lastSuccess: 0,
    },
    revalidation: {
      lastSuccess: 0
    }
  }

  // iterate all the projects
  for (var i = 0; i < allProjects.length; i++) {

    // schedule to the concurrent queue
    promises.push(async function () {
      try {

        // get config and skip if not yet any verifications
        var project = allProjects[i]
        var config = await getConfig(project)
        if (!req.query["all"] && config.verifications < 2) {
          return
        }

        // print the data and aggregate
        var data = {
          project: project,
          project_friendly_name: config.project_friendly_name,
          project_thumbnail: config.project_thumbnail,
          project_twitter_name: config.project_twitter_name,
          project_website: config.project_website,
          discord_url: config.discord_url,
          connected_twitter_name: config.connected_twitter_name,
          is_holder: config.is_holder,
          verifications: config.verifications,
          sales: (config.sales) ? config.sales : 0
        }
        projectData.push(data)
        if (config.is_holder) {
          aggregateData.projects.holder++
        }
        aggregateData.projects.active++
        aggregateData.verifications += data.verifications
        aggregateData.sales += data.sales
      } catch (e) {
        logger.info("error rendering project", e)
      }
    }())

    // throttle concurrency
    if (promises.length == maxConcurrentProjects) {
      logger.info(`waiting for ${promises.length} projects to complete`)
      await Promise.all(promises)
      promises = []
    }
  }

  // wait for queue to complete
  logger.info(`waiting for ${promises.length} remaining projects to complete`)
  await Promise.all(promises)

  // sort project data by sales and verifications
  projectData.sort((a: any, b: any) => (a.verifications + a.sales < b.verifications + b.sales) ? 1 : ((b.verifications + b.sales < a.verifications + a.sales) ? -1 : 0))

  // retrieve the elapsed time since last sales query
  var lockFileContents = await read(getSalesTrackerLockPath())
  if (lockFileContents && lockFileContents != "") {
    var elapsedCurrentRun = (Date.now() - new Date(parseInt(lockFileContents)).getTime()) / 1000
    aggregateData.tracker.inProgress = elapsedCurrentRun
  }

  // retrieve the elapsed time since last sales query
  var successFileContents = await read(getSalesTrackerSuccessPath())
  if (successFileContents && successFileContents != "") {
    var elapsedSinceLastRun = (Date.now() - new Date(parseInt(successFileContents)).getTime()) / 1000
    aggregateData.tracker.lastSuccess = elapsedSinceLastRun
  }

  // retrieve the elapsed time since last revalidation success
  var revalidationFileContents = await read(getRevalidationSuccessPath())
  if (revalidationFileContents && revalidationFileContents != "") {
    var elapsedSinceLastRun = (Date.now() - new Date(parseInt(revalidationFileContents)).getTime()) / 1000
    aggregateData.revalidation.lastSuccess = elapsedSinceLastRun
  }

  // return the data
  res.json({
    metrics: aggregateData,
    projects: projectData
  })
})

// Endpoint to create a new project
app.post('/createProject', async (req: any, res: Response) => {

  // Validates signature sent from client
  var publicKeyString = req.body.publicKey
  if (!isSignatureValid(publicKeyString, req.body.signature, process.env.MESSAGE)) {
    logger.info(`signature invalid for public key ${publicKeyString}`)
    return res.sendStatus(400)
  }

  // validate user does not own a project already
  try {
    var userProject = JSON.parse(await read(getPublicKeyFilePath(req.body.publicKey)))
    if (userProject && userProject.projectName != "") {
      logger.info(`address ${req.body.publicKey} already owns project ${userProject.projectName}`)
      return res.sendStatus(403)
    }
  } catch (e) {
    logger.info("error retreiving existing project", e)
  }

  // ensure we have a proper project name
  var projectNameCamel = toCamelCase(getFieldValue(req.body.project))

  // validate project name does not already exist
  const config = await getConfig(projectNameCamel)
  if (config) {
    logger.info(`project already exists: ${projectNameCamel}`)
    return res.sendStatus(409)
  }

  // Is the address a system level token holder?
  var holderRoles = await getHodlerRoles(publicKeyString, {
    discord_role_id: "project-verified",
    update_authority: process.env.UPDATE_AUTHORITY,
    spl_token: process.env.SPL_TOKEN
  })
  var isHolder = holderRoles.length > 0


  // validation of required fields
  var validationFailures: any[] = []
  var validateRequired = (k: string, v: string) => {
    if (v == "") {
      validationFailures.push({
        "field": k,
        "error": "field is required"
      })
    }
    return v
  }

  // create and validate the new project configuration
  var roles: any[] = []
  var newProjectConfig = {
    owner_public_key: publicKeyString,
    is_holder: isHolder,
    project_friendly_name: getFieldValue(req.body.project),
    project_twitter_name: getFieldValue(req.body.project_twitter_name),
    project_website: getFieldValue(req.body.project_website),
    message: `Verify ${getFieldValue(req.body.project)} Discord roles`,
    discord_url: getFieldValue(req.body.discord_url),
    discord_client_id: validateRequired("discord_client_id", getFieldValue(req.body.discord_client_id)),
    discord_server_id: validateRequired("discord_server_id", getFieldValue(req.body.discord_server_id)),
    discord_role_id: validateRequired("discord_role_id", getFieldValue(req.body.discord_role_id)),
    discord_redirect_url: `${process.env.BASE_URL}/${projectNameCamel}`,
    discord_bot_token: validateRequired("discord_bot_token", getFieldValue(req.body.discord_bot_token)),
    discord_webhook: getFieldValue(req.body.discord_webhook),
    update_authority: validateRequired("update_authority", getFieldValue(req.body.update_authority)),
    royalty_wallet_id: getFieldValue(req.body.royalty_wallet_id),
    spl_token: getFieldValue(req.body.spl_token),
    roles: roles,
    verifications: 0
  }
  if (req.body.discord_roles) {
    var roles: any[] = []
    req.body.discord_roles.forEach((role: any) => {
      if (role.key != "" && role.value != "" && role.discord_role_id != "") {
        if (role.required_balance == "") {
          role.required_balance = 1
        }
        roles.push(role)
      }
    })
    newProjectConfig.roles = roles
  }
  if (validationFailures.length > 0) {
    logger.info("invalid request:", JSON.stringify(validationFailures))
    return res.sendStatus(400)
  }
  var isSuccessful = await write(getConfigFilePath(projectNameCamel), JSON.stringify(newProjectConfig))
  if (!isSuccessful) {
    return res.sendStatus(500)
  }

  // create mapping of wallet public key to project name
  isSuccessful = await write(getPublicKeyFilePath(publicKeyString), JSON.stringify({
    projectName: projectNameCamel
  }))
  if (!isSuccessful) {
    return res.sendStatus(500)
  }

  // save and return
  logger.info(`successfully created project ${projectNameCamel} for owner ${publicKeyString}`)
  return res.json(newProjectConfig)
})

// Endpoint to update an existing project 
app.post('/updateProject', async (req: any, res: Response) => {

  // Validates signature sent from client
  var publicKeyString = req.body.publicKey
  if (!isSignatureValid(publicKeyString, req.body.signature, process.env.MESSAGE)) {
    logger.info(`signature invalid for public key ${publicKeyString}`)
    return res.sendStatus(400)
  }

  // validate user owns the project
  var projectName = ""
  try {
    var userProject = JSON.parse(await read(getPublicKeyFilePath(req.body.publicKey)))
    if (!userProject || userProject.projectName != req.body.project) {
      logger.info(`address ${req.body.publicKey} does not own a project`)
      return res.sendStatus(401)
    }
    projectName = userProject.projectName
  } catch (e) {
    logger.info("user does not own project", e)
    return res.sendStatus(401)
  }

  // validate project name does not already exist
  const config = await getConfig(projectName)
  if (!config) {
    logger.info(`project does not exist: ${projectName}`)
    return res.sendStatus(404)
  }

  // Has the management wallet become a token holder to unlock premium features? Only
  // make this check if the user is not currently a holder. We will allow previous
  // holders to remain holders even if the NFT is transferred out of the wallet.
  if (!config.is_holder) {
    var holderRoles = await getHodlerRoles(publicKeyString, {
      discord_role_id: "project-verified",
      update_authority: process.env.UPDATE_AUTHORITY,
      spl_token: process.env.SPL_TOKEN
    })
    config.is_holder = holderRoles.length > 0
  }

  // update values that have been modified
  if (req.body.discord_url) {
    config.discord_url = getFieldValue(req.body.discord_url)
  }
  if (req.body.discord_client_id) {
    config.discord_client_id = getFieldValue(req.body.discord_client_id)
  }
  if (req.body.discord_server_id) {
    config.discord_server_id = getFieldValue(req.body.discord_server_id)
  }
  if (req.body.discord_role_id) {
    config.discord_role_id = getFieldValue(req.body.discord_role_id)
  }
  if (req.body.discord_bot_token && req.body.discord_bot_token != defaultRedactedString) {
    config.discord_bot_token = getFieldValue(req.body.discord_bot_token)
  }
  if (req.body.discord_webhook && req.body.discord_webhook != defaultRedactedString) {
    config.discord_webhook = getFieldValue(req.body.discord_webhook)
  }
  if (req.body.update_authority) {
    config.update_authority = getFieldValue(req.body.update_authority)
  }
  if (req.body.project_friendly_name) {
    config.project_friendly_name = getFieldValue(req.body.project_friendly_name)
  }
  if (req.body.project_twitter_name) {
    config.project_twitter_name = getFieldValue(req.body.project_twitter_name)
  }
  if (req.body.project_website) {
    config.project_website = getFieldValue(req.body.project_website)
  }
  if (req.body.royalty_wallet_id) {
    config.royalty_wallet_id = getFieldValue(req.body.royalty_wallet_id)
  }
  if (req.body.spl_token) {
    config.spl_token = getFieldValue(req.body.spl_token)
  }
  if (req.body.twitterAccessToken) {
    config.twitterAccessToken = getFieldValue(req.body.twitterAccessToken)
  }
  if (req.body.twitterTokenSecret) {
    config.twitterTokenSecret = getFieldValue(req.body.twitterTokenSecret)
  }
  if (req.body.twitterUsername) {
    config.connected_twitter_name = getFieldValue(req.body.twitterUsername)
  }
  if (req.body.discord_roles) {
    var roles: any[] = []
    req.body.discord_roles.forEach((role: any) => {
      if (role.key != "" && role.value != "" && role.discord_role_id != "") {
        if (role.required_balance == "") {
          role.required_balance = 1
        }
        roles.push(role)
      }
    })
    config.roles = roles
  }

  // write updated config
  var isSuccessful = await write(getConfigFilePath(projectName), JSON.stringify(config))
  if (!isSuccessful) {
    return res.sendStatus(500)
  }

  // save and return
  logger.info(`successfully updated project ${projectName} for owner ${publicKeyString}`)
  return res.json(config)
})

app.post('/deleteProjectVote', async (req: any, res: Response) => {

  // Validates signature sent from client
  var publicKeyString = req.body.publicKey
  if (!isSignatureValid(publicKeyString, req.body.signature, process.env.MESSAGE)) {
    logger.info(`signature invalid for public key ${publicKeyString}`)
    return res.sendStatus(400)
  }

  // validate user owns the project
  try {
    var userProject = JSON.parse(await read(getPublicKeyFilePath(req.body.publicKey)))
    if (!userProject || userProject.projectName != req.body.project) {
      logger.info(`address ${req.body.publicKey} does not own a project`)
      return res.sendStatus(401)
    }
  } catch (e) {
    logger.info("user does not own project", e)
    return res.sendStatus(401)
  }

  // save the project vote
  if (!await deleteVote(req.body.project, req.body.voteID)) {
    logger.info(`unable to delete project ${req.body.project} vote ${req.body.voteID}`)
    return res.sendStatus(409)
  }
  return res.sendStatus(200)
})

app.post('/createProjectVote', async (req: any, res: Response) => {

  // Validates signature sent from client
  var publicKeyString = req.body.publicKey
  if (!isSignatureValid(publicKeyString, req.body.signature, process.env.MESSAGE)) {
    logger.info(`signature invalid for public key ${publicKeyString}`)
    return res.sendStatus(400)
  }

  // validate user owns the project
  try {
    var userProject = JSON.parse(await read(getPublicKeyFilePath(req.body.publicKey)))
    if (!userProject || userProject.projectName != req.body.project) {
      logger.info(`address ${req.body.publicKey} does not own a project`)
      return res.sendStatus(401)
    }
  } catch (e) {
    logger.info("user does not own project", e)
    return res.sendStatus(401)
  }

  // sanitize the inputs before passing to create function
  try {
    var title = getFieldValue(req.body.title)
    var expiresInDaysStr = getFieldValue(req.body.expiryTime)
    var expiryTime = Date.now() + (1000 * 60 * 60 * 24 * parseInt(expiresInDaysStr))
    var requiredRoles: any = []
    for (var i = 0; i < req.body.requiredRoles.length; i++) {
      var v = getFieldValue(req.body.requiredRoles[i])
      if (!v) {
        continue
      }
      requiredRoles.push(v)
    }
    var choices: any = []
    for (var i = 0; i < req.body.choices.length; i++) {
      var v = getFieldValue(req.body.choices[i])
      if (!v) {
        continue
      }
      choices.push(v)
    }

    // validate the input
    if (choices.length == 0 || requiredRoles.length == 0 || !title || !expiresInDaysStr) {
      logger.info(`invalid input received: ${JSON.stringify(req.body)}`)
      return res.sendStatus(400)
    }

    // save the project vote
    if (!await createVote(req.body.project, title, expiryTime, requiredRoles, choices)) {
      logger.info(`unable to save project ${req.body.project} vote`)
      return res.sendStatus(500)
    }
  } catch (e) {
    logger.info(`invalid input ${JSON.stringify(req.body)}`, e)
    return res.sendStatus(400)
  }

  // successfully created the vote
  return res.sendStatus(201)
})

app.post('/getProjectVotes', async (req: any, res: Response) => {

  // Validates signature sent from client
  var publicKeyString = req.body.publicKey
  if (!isSignatureValid(publicKeyString, req.body.signature, process.env.MESSAGE)) {
    logger.info(`signature invalid for public key ${publicKeyString}`)
    return res.sendStatus(400)
  }

  // retrieve project votes
  var projectVotes = await getProjectVotesForUser(req.body.project, publicKeyString)
  return res.json(projectVotes)
})

// Endpoint to cast vote
app.post('/castProjectVote', async (req: any, res: Response) => {

  // Validates signature sent from client
  var publicKeyString = req.body.publicKey
  if (!isSignatureValid(publicKeyString, req.body.signature, process.env.MESSAGE)) {
    logger.info(`signature invalid for public key ${publicKeyString}`)
    return res.sendStatus(400)
  }

  // cast the vote for this user selection
  if (await castVote(req.body.project, req.body.id, publicKeyString, req.body.vote)) {
    return res.sendStatus(201)
  }
  return res.sendStatus(403)
})

// Endpoint to validate a wallet and add role(s) to Discord user
app.post('/verify', async (req: Request, res: Response) => {

  // wallet public key string
  var publicKeyString = req.body.publicKey

  try {

    // retrieve config and ensure it is valid
    const config = await getConfig(req.body.projectName)
    if (!config) {
      return res.sendStatus(404)
    }

    // validate free tier not over verification limit
    var maxFreeVerifications = parseInt((process.env.MAX_FREE_VERIFICATIONS) ? process.env.MAX_FREE_VERIFICATIONS : "-1")
    if (!config.is_holder && maxFreeVerifications > 0) {
      if (config.verifications > maxFreeVerifications) {
        logger.info(`free verifications for ${req.body.projectName} has been reached (${config.verifications})`)
        return res.sendStatus(403)
      }
    }

    // Validates signature sent from client
    if (!isSignatureValid(publicKeyString, req.body.signature, config.message)) {
      logger.info(`signature invalid for public key ${publicKeyString}`)
      return res.sendStatus(400)
    }

    // store the discord name from the body
    const discordName = req.body.discordName

    // If matched NFTs are not empty and it's not already in the JSON push it
    var updatedConfig = false
    var verifiedRoles = await getHodlerRoles(publicKeyString, config)
    if (verifiedRoles.length > 0) {
      let hasHodler = false
      var hodlerList = await getHodlerList(req.body.projectName)
      for (let n of hodlerList) {
        if (n.discordName === discordName && n.publicKey == publicKeyString) {
          hasHodler = true
        }
      }
      if (!hasHodler) {
        logger.info(`adding ${discordName} to hodler list with wallet ${publicKeyString}`)
        hodlerList.push({
          discordName: discordName,
          publicKey: publicKeyString,
          roles: verifiedRoles
        })

        // increment verification count
        var count = (config.verifications) ? config.verifications : 0
        config.verifications = ++count
        updatedConfig = true
      }
    } else {
      logger.info("user not verified: " + publicKeyString)
      return res.sendStatus(401)
    }

    const username = discordName.split('#')[0]
    const discriminator = discordName.split('#')[1]
    const client = await getDiscordClient(req.body.projectName)
    if (!client) {
      return res.sendStatus(404)
    }

    // Update role
    var rolesAdded: any[] = []
    const myGuild = await client.guilds.cache.get(config.discord_server_id)
    if (!myGuild) {
      logger.info(`wallet ${publicKeyString} error retrieving server information`)
      return res.sendStatus(500)
    }
    const doer = await myGuild.members.cache.find((member: any) => (member.user.username === username && member.user.discriminator === discriminator))
    if (!doer) {
      logger.info(`wallet ${publicKeyString} error finding user ${discordName} on server ${config.discord_server_id}`)
      return res.sendStatus(404)
    }
    for (var i = 0; i < verifiedRoles.length; i++) {
      const role = await myGuild.roles.cache.find((r: any) => r.id === verifiedRoles[i])
      if (!role) {
        logger.info(`wallet ${publicKeyString} error retrieving role information ${verifiedRoles[i]}`)
        continue
      }

      // add role to user account
      await doer.roles.add(role)
      logger.info(`wallet ${publicKeyString} successfully added user ${discordName} role ${verifiedRoles[i]}`)
      rolesAdded.push({
        id: verifiedRoles[i],
        name: role.name
      })

      // save name of role if it has changed
      try {
        if (!config.discord_role_names) {
          config.discord_role_names = JSON.parse('{}')
        }
        if (config.discord_role_names[verifiedRoles[i]] != role.name) {
          logger.info(`updating config with project role name ${verifiedRoles[i]}=${role.name}`)
          config.discord_role_names[verifiedRoles[i]] = role.name
          updatedConfig = true
        }
      } catch (e) {
        logger.info("error storing role name", e)
      }
    }

    // write the config if updated
    if (updatedConfig) {
      await write(getConfigFilePath(req.body.projectName), JSON.stringify(config))
    }

    // write result and return successfully
    await write(getHodlerFilePath(req.body.projectName), JSON.stringify(hodlerList))
    res.json(rolesAdded)
  } catch (e) {
    logger.info(`error processing wallet ${publicKeyString}`, e)
    res.sendStatus(500)
  }
})

// export the app
module.exports = app
