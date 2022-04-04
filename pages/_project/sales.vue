<template class="main">
  <div>
      <div class="block text-gray-700 text-sm mx-auto" v-if="step === 1">
        <img class="mx-auto" src="/loading.gif">
      </div>
      <div class="block text-gray-700 text-sm" v-if="step === 2">
        Project not found.
      </div>
      <div class="block text-gray-700 text-sm" v-if="step === 3"> 
        <h2 class="block text-gray-700 text-2xl font-bold mb-5">{{projectName}} Sales</h2>
        <div class="flex flex-wrap -mx-4 -mb-8">
          <div v-if="this.sales.length == 0" class="px-4 mb-8">Watching for sales, but have not detected any so far!</div>
          <div v-for="sale in sales" class="md:w-1/3 px-4 mb-8"> 
            <a :href="sale.data.nftInfo.mintLink">
              <img class="rounded shadow-md" :src="sale.data.nftInfo.image" alt="">
            </a>
            <div class="mt-2 text-gray-700 text-xs">
              <a :href="sale.data.txLink">{{sale.data.nftInfo.id}} @ {{sale.data.saleAmount}} SOL</a>
            </div>
            <div class="mt-0 text-gray-400 text-xs">
              {{sale.data.relativeTime}}
            </div>
          </div>
        </div>
      </div>
      <div class="block text-gray-700 text-sm mt-5" v-if="step > 2">
        <h2 class="block text-gray-700 text-lg font-bold mb-2">What is NFT 4 Cause?</h2>
        <div class="block text-gray-700 text-sm mb-2">
        At <a class="hyperlink" href="http://www.nft4cause.app">NFT 4 Cause</a> we create socially relevant NFTs to generate funds for global nonprofits. <b>Every NFT minted or traded on a secondary market is an 80% donation!</b> Everything else funds the development of tools like this to enhance the Solana community.
        </div>
      </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import axios from 'axios'
var hdate = require('human-date')

export default Vue.extend({
  data() {
    return { 
      step: 1,
      projectName: '',
      sales: []
    }
  },

  async mounted() {

    // Retrieve the project config based on wildcard path
    var projectName = this.$route.path.replaceAll("/sales", "").replaceAll("/","")

    // retrieve project config
    try { 
      var projectConfig = await axios.get('/api/getProject?project=' + projectName)
      this.projectName = projectConfig.data.project_friendly_name
    } catch (e) {
      console.log(e) 
    }

    // retrieve sales and add links
    var projectSales
    try {
      projectSales = await axios.get('/api/getProjectSales?project=' + projectName)
      for (var i=0; i < projectSales.data.sales.length; i++) {
        projectSales.data.sales[i].data.relativeTime = hdate.relativeTime(new Date(projectSales.data.sales[i].data.time*1000))
        projectSales.data.sales[i].data.txLink = "https://solscan.io/tx/" + projectSales.data.sales[i].data.txSignature
        projectSales.data.sales[i].data.nftInfo.mintLink = "https://solscan.io/token/" + projectSales.data.sales[i].data.nftInfo.mint
      }

      // render the properties
      this.sales = projectSales.data.sales.reverse()
    } catch (e) {
      console.log(e) 
    }

    // return not found if the project config is empty
    if (!projectSales) {
      this.step = 2
      return
    }

    // load the sales data
    this.step = 3
  }
})
</script>
