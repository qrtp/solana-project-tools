<template >
    <div>
        <h2 class="block text-gray-700 text-2xl font-bold mb-2">Connecting Twitter</h2>
        <div class="block text-gray-700 text-sm mx-auto" v-if="step === 1">
            <img class="mx-auto" src="/loading.gif">
        </div>
        <div class="block text-gray-700 text-sm mx-auto" v-if="step === 2">
            <v-icon>mdi-check-circle</v-icon> Successfully connected @{{userName}}!
            <br>
            <br>
            <a href="/manage" class="hyperlink">Back to project</a>
        </div>
        <div class="block text-gray-700 text-sm mx-auto" v-if="step === 3">
            {{error}}
        </div>
        <div class="block text-gray-700 text-sm" v-if="step === 4">
            We're having trouble connecting to your wallet. The currently supported wallet configuration is <a class="hyperlink" href="https://phantom.app/">Phantom</a> with browser extension on a desktop or laptop device. Mobile support coming soon, and we are working to add support for additional wallet vendors!
            <br>
            <br>
            Please ensure Phantom is available on your device and try again.
        </div>
        <div class="block text-gray-700 text-sm" v-if="step === 5">
            Please sign the message to verify that you're the owner of your wallet. We will connect your Twitter account to the project associated with your wallet.
            <br>
            <br>
            Review the message before signing and make sure that nothing else is requested except signature.
        </div>
        
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import axios from 'axios';

export default Vue.extend({
  data() {
    return {
      step: 1,
      user: {},
      userName: '',
      accessToken: '',
      tokenSecret: '',
      signature: '',
      publicKey: '',
      error: null,
    };
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
        }
      }
    } catch (e) {
      console.log("user is not logged in", e)
      this.step = 4
      return
    }

    try {
        // retrieve the twitter user's access key after OAuth is completed
        let res = await axios.get('/api/twitter/callback', {
        params: this.$route.query,
        })

        this.user = res.data.user;
        // @ts-ignore
        this.userName = this.user.username
        // @ts-ignore
        this.accessToken = this.user.access_token
        // @ts-ignore
        this.tokenSecret = this.user.token_secret
        this.step=2
    } catch (e) {
      this.error = e;
      this.step=3
      return  
    }

    try { 
      // save the access key
      let res2 = await axios.post('/api/updateProject', {
        // @ts-ignore I honestly didn't wanna bother with strong typing this.. Feel free if you'd like
        publicKey: this.publicKey,
        signature: this.signature,
        twitterUsername: this.userName,
        twitterAccessToken: this.accessToken,
        twitterTokenSecret: this.tokenSecret
      })
      console.log(`saved twitter connection status: ${res2.status} `)
      if (res2.status == 200) {
        this.step = 2
      }
    } catch (e) {
        console.log(e)
        this.error = e
        this.step=3
        return
    }
  },
});
</script>