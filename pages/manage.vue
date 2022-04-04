<template >
  <div>
    <div class="block text-gray-700 text-sm mx-auto" v-if="step === 0">
        <img class="mx-auto" src="/loading.gif">
    </div>
    <div v-if="step === 1">
        <h2 class="block text-gray-700 text-2xl font-bold mb-2">Let's get started!</h2>
        <div class="block text-gray-700 text-sm mb-5">
          Your NFT project tools are associated with your Solana wallet address. Connect your wallet to access the project management console.
        </div>
        <div class="block text-gray-700 text-sm mb-5">
          <v-dialog
            v-model="dialog"
            persistent
            max-width="305"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                color="primary"
                dark
                v-bind="attrs"
                v-on="on"
              >
                Connect Wallet
              </v-btn>
            </template>
            <v-card>
              <v-card-title class="text-h5">
                Choose a Wallet
              </v-card-title>
              <v-card-text>The wallet will be used as login credentials for your project.</v-card-text>
              <v-card-actions>
                <v-btn color="green darken-1" text @click="connectWallet('phantom')">Phantom</v-btn>
                <v-btn color="green darken-1" text @click="connectWallet('solflare')">Solflare</v-btn>
                <v-btn color="green darken-1" text @click="connectWallet('slope')">Slope</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Quick start guide</h2>
        <div class="block text-gray-700 text-sm mb-5">
          For those who want to get right to the point, <a href="https://github.com/qrtp/solana-discord-verification-bot/wiki/Setup-your-NFT-project">this is the guide for you</a>. 
        </div>
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Show me how to do it</h2>
        <div class="block text-gray-700 text-sm mb-5">
          We've provided a video to show you how to get your Solana NFT project up and running with our tools in just 10 minutes.
        </div>
        <iframe width="100%" height="323" src="https://www.youtube.com/embed/QFRDIN4athM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    <div v-if="step === 2">
      <h2 class="block text-gray-700 text-xl font-bold mb-2">Signature request</h2>
        <div class="block text-gray-700 text-sm mb-2">
          Please sign the message to verify that you're the owner of your wallet.
          <br>
          <br>
          Review the message before signing and make sure that nothing else is requested except signature.
        </div>
    </div>
    <div v-if="step === 3">
      <form @submit.prevent="submitForm" >
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Project configuration</h2>
        <div class="mb-4">
          <h2 class="block text-gray-700 text-sm font-bold mb-2">Project info</h2>
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="project" v-if="!this.configResponse" placeholder="Project name">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="project_friendly_name" v-if="this.configResponse" placeholder="Collection name">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="project_twitter_name" placeholder="@ProjectTwitterHandle">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="project_website" placeholder="Website URL">
        </div>
        <div class="mb-4">
          <h2 class="block text-gray-700 text-sm font-bold mb-2">Mint info</h2>
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="update_authority" placeholder="Update authority ID">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="royalty_wallet_id" placeholder="Treasury / royalty wallet ID">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="spl_token" placeholder="White list token ID">
        </div>
        <div class="mb-4">
          <h2 class="block text-gray-700 text-sm font-bold mb-2">Discord server info</h2>
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_url" placeholder="Discord URL">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_server_id" placeholder="Discord server ID">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_role_id" placeholder="Discord default role ID">
        </div>
        <div class="mb-4">
          <h2 class="block text-gray-700 text-sm font-bold mb-2">Discord bot info</h2>
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_client_id" placeholder="Discord bot client ID">
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="password" v-model="discord_bot_token" placeholder="Discord bot token">
        </div>
        <div class="mb-4">
          <h2 class="block text-gray-700 text-sm font-bold mb-2">Trait / count based role assignments (optional)</h2>
          <div class="form-group" v-for="(discord_role,k) in discord_roles" :key="k">
            <input class="mb-1 shadow appearance-none border rounded w-3/12 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_role.key" placeholder="Metadata key">
            <input class="mb-1 shadow appearance-none border rounded w-3/12 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_role.value" placeholder="Metadata value">
            <input class="mb-1 shadow appearance-none border rounded w-3/12 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_role.discord_role_id" placeholder="Discord role ID">
            <input class="mb-1 shadow appearance-none border rounded w-1/12 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="discord_role.required_balance" placeholder="#">
            <span>
              <a href="#" @click="remove(k)" v-show="k || ( !k && discord_roles.length > 1)">➖</a>
              <a href="#" @click="add(k)" v-show="k == discord_roles.length-1">➕</a>
            </span>
          </div>
        </div>
        <div class="mb-4">
          <h2 class="block text-gray-700 text-sm font-bold mb-2">Sales tracking notifications</h2>
          <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="password" v-model="discord_webhook" placeholder="Discord webhook URL">
        </div>
        <v-btn color="primary" @click="submitForm">Save</v-btn>
        <v-btn color="grey" @click="disconnectWallet">Cancel</v-btn>
      </form>
    </div>
    <div v-if="step === 4">
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Oops, something went wrong</h2>
        <div class="block text-gray-700 text-sm mb-2">
          Error saving project. Try again later.
        </div>
    </div>
    <div v-if="step === 5">
        <h2 class="block text-gray-700 text-2xl font-bold mb-2">All set!</h2>
        <div class="block text-gray-700 text-sm mb-2">
          Successfully created project.
        </div>
        <v-btn class="primary" @click="goToManage">Edit</v-btn>
    </div>
    <div v-if="step === 6">
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Oops, something went wrong</h2>
        <div class="block text-gray-700 text-sm mb-2">
          Error looking up user status.
        </div>
    </div>
    <div v-if="step === 7">
        <h2 class="block text-gray-700 text-2xl font-bold mb-2">All set!</h2>
        <div class="block text-gray-700 text-sm mb-2">
          Successfully updated project.
        </div>
        <v-btn class="primary" @click="goToManage">Edit</v-btn>
    </div>
    <div v-if="step === 8">
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Looks like you already own a project</h2>
        <div class="block text-gray-700 text-sm mb-2">
          Update your existing project instead of creating a new one.
        </div>
    </div>
    <div v-if="step === 9">
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Configuration already exists!</h2>
        <div class="block text-gray-700 text-sm mb-2">
          The project name or Discord server ID is already set up on our service. Try a new configuration.
        </div>
    </div>
    <div v-if="step === 10">
        <h2 class="block text-gray-700 text-xl font-bold mb-2">Invalid configuration</h2>
        <div class="block text-gray-700 text-sm mb-2">
          Double check your configuration values, something doesn't look right.
        </div>
    </div>
    <div class="block text-gray-700 text-sm" v-if="step === 11">
      We're having trouble connecting to your wallet. The currently supported wallets are <a class="hyperlink" href="https://phantom.app">Phantom</a>, <a class="hyperlink" href="https://solflare.com">Solflare</a> and <a class="hyperlink" href="https://slope.finance">Slope</a>. When using a mobile device, please ensure the current browser is supported by your wallet.
    </div>
    <div v-if="this.configResponse">
        <h2 class="block text-gray-700 text-xl font-bold mb-2 mt-5">Discord Verification Service</h2>
        <div class="block text-sm mb-2"> 
          ✅ <a class=hyperlink :href="this.discord_redirect_url">{{discord_redirect_url}}</a>
        </div>
        <div v-if="discord_remaining_verifications != '0'" class="block text-gray-700 text-sm mb-2">
          ✅ Quota remaining: {{discord_remaining_verifications}}
        </div>
        <div v-if="discord_remaining_verifications == '0'" class="block text-gray-700 text-sm mb-2">
          🚫 Quota remaining: {{discord_remaining_verifications}} (<a class="hyperlink" href="https://mint.nft4cause.app">unlock</a>)
        </div>
        <div v-if="this.is_holder" class="block text-gray-700 text-sm">
          ✅ Trait / count based role assignments
        </div>
        <div v-if="!this.is_holder" class="block text-gray-700 text-sm">
          🚫 Trait / count based role assignments (<a class="hyperlink" href="https://mint.nft4cause.app">unlock</a>)
        </div>
        <h2 class="block text-gray-700 text-xl font-bold mb-2 mt-5">Sales Tracking</h2>
        <div class="block text-sm mb-2"> 
          ✅ <a class=hyperlink :href="this.discord_redirect_url+'/sales'">{{discord_redirect_url}}/sales</a>
        </div>
        <div v-if="!this.is_holder" class="block text-gray-700 text-sm mb-2">
          ✅ Default Twitter notification bot <a class="hyperlink" href="https://twitter.com/nft4causeBot">@nft4causeBot</a>
        </div>
        <div v-if="this.is_holder && this.discord_webhook" class="block text-gray-700 text-sm mb-2">
          ✅ Discord notification bot
        </div>
        <div v-if="this.is_holder && !this.discord_webhook" class="block text-gray-700 text-sm mb-2">
          ➕ Discord notification bot (add webhook URL above)
        </div>
        <div v-if="!this.is_holder" class="block text-gray-700 text-sm mb-2">
          🚫 Discord notification bot (<a class="hyperlink" href="https://mint.nft4cause.app">unlock</a>)
        </div>
        <div v-if="this.$config.twitter_enabled">
          <div v-if="this.is_holder && this.connected_twitter_name" class="block text-gray-700 text-sm mb-2">
            ✅ Custom Twitter notification bot <a class="hyperlink" :href="'https://twitter.com/'+this.connected_twitter_name">@{{this.connected_twitter_name}}</a> (<a class="hyperlink" href="/api/twitter">update</a>)
          </div>
          <div v-if="this.is_holder && !this.connected_twitter_name" class="block text-gray-700 text-sm mb-2">
            ➕ Custom Twitter notification bot (<a class="hyperlink" href="/api/twitter">connect</a>)
          </div>
          <div v-if="!this.is_holder" class="block text-gray-700 text-sm mb-2">
            🚫 Custom Twitter notification bot (<a class="hyperlink" href="https://mint.nft4cause.app">unlock</a>)
          </div>
        </div>
        <h2 class="block text-gray-700 text-xl font-bold mb-2 mt-5">Voting</h2>
        <div v-if="this.is_holder">
          <div class="block text-gray-700 text-sm mb-2">
            ✅ <a class=hyperlink :href="this.discord_redirect_url+'/vote'">{{discord_redirect_url}}/vote</a>
          </div>
          <div class="block text-gray-700 text-sm mb-2">
            <v-dialog
              v-model="voteDialog"
              persistent
              max-width="305"
            >
              <template v-slot:activator="{ on, attrs }">
                <a href="#" @click="voteDialog=true">➕ Create new vote</a>
              </template>
              <v-card>
                <v-card-title class="text-h5">
                  Create vote
                </v-card-title>
                <v-card-text>Create a vote below. Please note, votes cannot be modified. Once the first vote is cast a vote cannot be deleted.</v-card-text>
                <v-card-text>
                  <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="voteTitle" placeholder="Vote question">
                  <input class="mb-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" v-model="voteChoices" placeholder="Vote choices (choice 1, choice 2)">
                  <v-select
                    v-model="voteExpiryTime"
                    :items="voteExpiryTimeItems"
                    attach
                    label="Days until close"
                  ></v-select>
                  <v-select
                    v-model="voteRequiredRoles"
                    :items="voteRequiredItems"
                    attach
                    chips
                    label="Eligible roles"
                    multiple
                  ></v-select>
                </v-card-text>
                <v-card-actions>
                  <v-btn color="green darken-1" text @click="createVote()">Create</v-btn>
                  <v-btn color="green darken-1" text @click="voteDialog=false">Cancel</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </div>
        </div>
        <div v-if="!this.is_holder" class="block text-gray-700 text-sm mb-2">
          🚫 Holder only voting service (<a class="hyperlink" href="https://mint.nft4cause.app">unlock</a>)
        </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import axios from 'axios'
import Solflare from '@solflare-wallet/sdk';
const { binary_to_base58 } = require('base58-js')

export default Vue.extend({
  data() {
    return {
      voteDialog: false,
      discordUsername: '',
      step: 0,
      discordAvatar: '',
      signature: '',
      publicKey: '',
      isUpdate: false,
      project: '',
      project_friendly_name: '',
      project_twitter_name: '',
      project_website: '',
      update_authority: '',
      spl_token: '',
      royalty_wallet_id: '',
      discord_url: '',
      discord_server_id: '',
      discord_role_id: '',
      discord_client_id: '',
      discord_bot_token: '',
      discord_webhook: '',
      configResponse: null,
      discord_redirect_url: '',
      discord_remaining_verifications: '',
      is_holder: false,
      connected_twitter_name: '',
      discord_roles: [{
        discord_role_id: '',
        required_balance: '',
        key: '',
        value: ''
      }],
      voteTitle: '',
      voteExpiryTime: '',
      voteExpiryTimeItems: ["1","2","3","4","5","6","7","8","9","10"],
      voteRequiredItems: [],
      voteRequiredRoles: [],
      voteChoices: '',
    }
  },
  async mounted() {

    // determine if user is already logged in
    try {
      let res = await axios.get('/api/getConnectedWallet')
      if (res.data) {
        if (res.data.publicKey && res.data.signature) {
          console.log(`wallet is connected ${res.data.publicKey}`)
          this.publicKey = res.data.publicKey
          this.signature = res.data.signature
          this.connectWallet("")
        }
      }
    } catch (e) {
      console.log("user is not logged in", e)
      this.step = 1
    }
  },
  methods: {
    async createVote() {
      try {
        var res = await axios.post('/api/createProjectVote', {
          signature: this.signature,
          publicKey: this.publicKey,
          // @ts-ignore
          project: this.project,
          // @ts-ignore
          title: this.voteTitle,
          // @ts-ignore
          expiryTime: this.voteExpiryTime,
          // @ts-ignore
          requiredRoles: this.voteRequiredRoles,
          // @ts-ignore
          choices: this.voteChoices.split(",")
        })
        this.voteTitle = ""
        this.voteExpiryTime = "1"
        this.voteChoices = ""
        this.voteDialog = false
        this.goToVoting()
      } catch(e) {
        console.log("error saving vote", e)
      }
    },
    async disconnectWallet() {
      try {
        let res = await axios.get('/api/disconnectWallet')
        this.publicKey = ''
        this.signature = ''
        this.configResponse = null
      } catch (e) {
        console.log("signature could not be validated", e) 
      }
      this.step = 1
    },
    async connectWallet(walletType:string) {
      
      if (!this.signature || !this.publicKey) {
        try {

          // determine the type of wallet
          let wallet 
          if (walletType == "phantom") {
            // connect to phantom wallet
            wallet = window.solana
          } else if (walletType == "slope"){
            // connect to slope wallet
            wallet = new window.Slope()
          } else {
            // connect to solflare wallet
            wallet = new Solflare();
          }

          // connect to the wallet interface
          await wallet.connect();
          this.step = 2
 
          // Signs message to verify authority
          const message = this.$config.message
          const encodedMessage = new TextEncoder().encode(message)
          const signedMessage = await wallet.signMessage(encodedMessage, 'utf8')
          
          // determine b58 encoded signature
          if (signedMessage.data && signedMessage.data.signature) {
            // slope format
            this.signature = signedMessage.data.signature
            this.publicKey = signedMessage.data.publicKey
          } else {
            // phantom and solflare format
            this.signature = binary_to_base58((signedMessage.signature)?signedMessage.signature:signedMessage)
            this.publicKey = wallet.publicKey.toString()
          }
          console.log(`publicKey=${this.publicKey}, signature=${this.signature}`)
          
          // pre-validate the signature
          try {
            let res = await axios.post('/api/connectWallet', {
              signature: this.signature,
              publicKey: this.publicKey
            })
            console.log("validated signature for wallet", this.publicKey)
          } catch (e) {
            console.log("signature could not be validated", e)
          }
        } catch (e) {
          console.log(e)
          this.step = 11
          return
        }
      }

      // determine if there is an existing project for user 
      let res 
      try{   
        res = await axios.get('/api/getProject?publicKey='+this.publicKey)
        this.configResponse = res.data
        this.discord_redirect_url = res.data.discord_redirect_url
        this.connected_twitter_name = res.data.connected_twitter_name
        this.is_holder = res.data.is_holder
        if (res.data.is_holder) {
          this.discord_remaining_verifications = "unlimited"
        } else {
          // @ts-ignore
          this.discord_remaining_verifications = this.$config.max_free_verifications - res.data.verifications
        }
      }  catch(e) {
        console.log("retrieve project error", e)
      } 
      if (res?.status == 200) { 
        console.log("found existing project:", JSON.stringify(res.data))
        this.isUpdate = true
        this.project = res.data.project
        this.update_authority = res.data.update_authority
        this.spl_token = res.data.spl_token
        this.project_friendly_name = res.data.project_friendly_name
        this.project_twitter_name = res.data.project_twitter_name
        this.project_website = res.data.project_website
        this.royalty_wallet_id = res.data.royalty_wallet_id
        this.discord_url = res.data.discord_url
        this.discord_server_id = res.data.discord_server_id
        this.discord_role_id = res.data.discord_role_id
        this.discord_client_id = res.data.discord_client_id
        this.discord_bot_token = res.data.discord_bot_token
        this.discord_webhook = res.data.discord_webhook
        if (res.data.discord_roles && res.data.discord_roles.length > 0) { 
          this.discord_roles = res.data.discord_roles
        }
        this.populateVoteDropdowns()
      }
      this.step = 3
    },
    populateVoteDropdowns() {
      var roles : string[] = []
      roles.push(this.discord_role_id)
      if (this.discord_roles) {  
        for (var i=0; i < this.discord_roles.length; i++) {
          roles.push(this.discord_roles[i].discord_role_id)
        }
      }
      // @ts-ignore
      this.voteRequiredItems = roles
      // @ts-ignore
      this.voteRequiredRoles.push(this.discord_role_id)
      this.voteExpiryTime = "1"
    },
    goToManage(){
      this.$router.push('/manage');
      this.step = 3
    },
    goToVoting(){
      this.$router.push('/' + this.project + '/vote');
    },
    add () {
      this.discord_roles.push({
        discord_role_id: '',
        required_balance: '',
        key: '',
        value: ''
      })
      console.log(this.discord_roles)
    },
    remove (index:number) {
      this.discord_roles.splice(index, 1)
    },
    connectTwitter() {
      alert("hello " + this.publicKey)
    },
    async submitForm() {
        let res 
        try{
          var url = (!this.isUpdate) ? '/api/createProject' : '/api/updateProject'
          res = await axios.post(url, {
            signature: this.signature,
            publicKey: this.publicKey,
            // @ts-ignore
            project: this.project,
            // @ts-ignore
            update_authority: this.update_authority,
            // @ts-ignore
            spl_token: this.spl_token,
            // @ts-ignore
            project_friendly_name: this.project_friendly_name,
            // @ts-ignore
            project_twitter_name: this.project_twitter_name,
            // @ts-ignore
            project_website: this.project_website,
            // @ts-ignore
            royalty_wallet_id: this.royalty_wallet_id,
            // @ts-ignore
            discord_url: this.discord_url,
            // @ts-ignore
            discord_server_id: this.discord_server_id,
            // @ts-ignore
            discord_role_id: this.discord_role_id,
            // @ts-ignore
            discord_client_id: this.discord_client_id,
            // @ts-ignore
            discord_bot_token: this.discord_bot_token,
            // @ts-ignore
            discord_webhook: this.discord_webhook,
            // @ts-ignore
            discord_roles: this.discord_roles
          })
          this.configResponse = res.data
          this.discord_redirect_url = res.data.discord_redirect_url
          this.connected_twitter_name = res.data.connected_twitter_name
          this.is_holder = res.data.is_holder
          if (res.data.is_holder) {
            this.discord_remaining_verifications = "unlimited"
          } else {
            // @ts-ignore
            this.discord_remaining_verifications = this.$config.max_free_verifications - res.data.verifications
          }
          this.populateVoteDropdowns()
        } catch(e) {
            if (e.toString().includes("status code 409")) {
              this.step = 9
            } else if(e.toString().includes("status code 403")) {
              this.step = 8
            } else if(e.toString().includes("status code 400")) {
              this.step = 10
            } else {
              console.log("API ERROR", e)
              this.step = 4
            }
            return
        }
        console.log("Status:" + res.status)
        if (!this.isUpdate) {
          this.step = 5
        } else {
          this.step = 7
        }
        
    }
  } 
})
</script>
