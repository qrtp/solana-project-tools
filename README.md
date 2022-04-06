# Solana Project Tools

NFT 4 Cause develops opensource tools because we believe in giving back to the Solana NFT community. Our mission is to enable projects to focus their funds on developing their community and making progress on their roadmap.

The primary purpose of this repository is to enable Solana NFT project owners to assign custom Discord server roles to users holding their NFT. The Discord user navigates to a verification URL to submit their wallet for analysis, and the Discord role is immediately assigned if holding criteria is met. 

Additional services offered in the project tools suite:

1. NFT holder only voting service
1. Sales tracking
1. Sales notification bots for Twitter and Discord

Full documentation of the service features can be found on our [wiki](https://github.com/qrtp/solana-project-tools/wiki). For any questions message me on twitter [@NFT4Cause](https://twitter.com/nft4cause).

# Hosted service
We offer this project as a free hosted service at [https://verify.4cause.app](https://verify.4cause.app). Feel free to register your project on our highly available deployment across IBM Cloud and Google Cloud.

## Demonstration video
Want to see it in action? There's a [live demo on YouTube](https://www.youtube.com/watch?v=QFRDIN4athM) showing how our hosted service can be used to verify users for any Solana NFT project and assign Discord roles to a specified server.

# Deploy your own service
Keep reading if you'd like to host this project yourself :)
## Prerequisites
1. Discord knowledge
1. Discord app and bot created and added to your server
1. Proper .env file

## How to set up .env file
I'll go over every parameter of .env.example and explain what it does and how to get it.
Needless to say, rename .env.example to .env and update values as per instruction -

### UPDATE_AUTHORITY
Service level NFT token update authority that will grant user premium access to features.
### SPL_TOKEN
Additional SPL token that unlocks premium features (optional)
### RELOAD_INTERVAL_MINUTES
Interval at which revalidation is required for a project.
### REVALIDATION_MODE
Boolean value indicating if service is running in user facing mode or revalidation mode. Revalidations must be performed by standalone offline processes for performance and scaling purposes.
### MAX_FREE_VERIFICATIONS
Maximum number of verifications for a project with basic service.
### MESSAGE
The message text a user will sign to verify they own a wallet.
### BASE_URL
Base URL of your domain. For our hosted service this is [https://verify.4cause.app](https://verify.4cause.app).
### PRODUCT_NAME
Title of your service.
### UPGRADE_URL
URL for your mint where user's can buy upgrade service.
### ABOUT_URL
URL to your main project website to get information about you.
### LOGO_URL
Link to an image for the navigation banner.
### TWITTER_CONSUMER_KEY
OAUTH consumer key for connecting user's Twitter account.
### TWITTER_CONSUMER_SECRET
OAUTH consumer secret for connecting user's Twitter account.
### DISCORD_INVITE
Discord invite code.
### HOST
Leave as default 0.0.0.0 if having issues deploying to a VPS/Dedicated server.
### PORT
Your required port eg: 8443
### TWITTER_DBOT
Default Twitter Sales Bot user.
### TWITTER_HANDLE
Your Twitter Handle.
### TWITTER_SESSION_SECRET
Any string of your choosing, used to secure user session cookie.
### COS_CONFIG
Configuration JSON for IBM Cloud Object Storage. If COS configuration is provided, files will be stored on IBM Cloud instead of the local filesystem.

#### How to get IBM Cloud Object Storage
Good news, it's free! There is [great documentation](https://cloud.ibm.com/docs/cloud-object-storage/about-cos.html#about-ibm-cloud-object-storage) with full details on how to register for IBM Cloud and get a Cloud Object Storage instance. High level steps are:

- Register for a new [cloud.ibm.com](https://cloud.ibm.com) account
- Navigate to the [Cloud Object Storage console](https://cloud.ibm.com/objectstorage/)
- Create a COS service instance
- Create an API key to access the COS service instance
- Create a COS bucket in the COS service instance

Once you have those steps complete, just fill in the configuration template below. Note, I used the `us-south` endpoint in the example below but you can use any of the global endpoints in the config.

#### Sample configuration value
If you want to use COS, use the following format but with your own data `COS_CONFIG={"instanceID":"<your COS instance CRN>","apiKey":"<your COS API key>","bucket":"<your COS bucket name>","endpoint":"s3.us-south.cloud-object-storage.appdomain.cloud","storageClass":"us-south-standard"}`

## Deployment

Our service is provisioned as a Docker container across IBM Cloud and Google Cloud for high availability. If you would like to roll your own deployment, feel free to choose your favorite cloud provider!

## Build Setup (VPS/Dedicated Server)

```bash
# clone repo
$ git clone https://github.com/qrtp/solana-project-tools.git
$ cd solana-project-tools

# install nodejs 16.x
$ apt install -y curl
$ curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
$ apt install -y nodejs

# check node version
$ node --version

# install yarn
$ npm install --global yarn

# install pm2
$ npm install pm2 -g

# install dependencies
$ yarn install

# build for production and launch server
$ yarn build
$ pm2 start Discord

# Browse to ip:8443 or ip:<port-set-in-env-file>
```

## Update Script
```bash
# pm2 stop Discord

# copy .env file to safe location

# clone repo
$ git clone https://github.com/qrtp/solana-project-tools.git
$ cd solana-project-tools

# copy .env file back to project repo


# edit meta data (line 8) in nuxtjs.config.js

# build for production and launch server
$ yarn build
$ pm2 start Discord
```
