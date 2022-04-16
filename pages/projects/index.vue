<template >
    <div>
      <h2 class="block text-gray-700 text-2xl font-bold mb-2">Project Leaderboard</h2>
      <div class="block text-gray-700 text-sm mx-auto" v-if="step === 0">
          <img class="mx-auto" src="/loading.gif">
      </div>
      <div class="block text-gray-700 text-sm mx-auto" v-if="step === 1">
          <v-data-table
            :headers="headers"
            :items="projects"
            :items-per-page="10"
            :mobile-breakpoint="200"
          >
            <template #item.project_friendly_name="{ item }">
              <a class="hyperlink" :href="`/${item.project}/sales`">{{ item.project_friendly_name }}</a>
            </template>
            <template #item.is_holder="{ item }">
              <div v-if="item.is_holder"><v-icon small>mdi-hand-coin</v-icon></div>
            </template>
            <template #item.project_website="{ item }">
              <a v-if="item.project_website" target="_blank" :href="`${item.project_website}`"><v-icon small>mdi-web</v-icon></a>
            </template>
            <template #item.twitter_username="{ item }">
              <a v-if="item.twitter_username" target="_blank" :href="`https://www.twitter.com/${item.twitter_username}`"><v-icon small>mdi-twitter</v-icon></a>
            </template>
            <template #item.discord_url="{ item }">
              <a v-if="item.discord_url" target="_blank" :href="`${item.discord_url}`"><v-icon small>mdi-discord</v-icon></a>
            </template>
          </v-data-table>
          <v-icon>mdi-hand-coin</v-icon> = NFT 4 Cause <a href="https://mint.nft4cause.app">donation</a>
      </div>
      <div class="block text-gray-700 text-sm mx-auto" v-if="step === 2">
        <div class="block text-gray-700 text-sm mb-2">
          Error looking up projects. Try again later.
        </div>
      </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import axios from 'axios';

export default Vue.extend({
  data() {
    return {
      step: 0,
      projects: null,
      headers: [
          {
            text: 'Project',
            align: 'left',
            sortable: false,
            value: 'project_friendly_name',
          },
          { text: '', align: 'left', value: 'is_holder' },
          { text: '', align: 'left', value: 'project_website' },
          { text: '', align: 'left', value: 'twitter_username' },
          { text: '', align: 'left', value: 'discord_url' },
          { text: 'Verified', align: 'left', value: 'verifications' },
          { text: 'Sales', align: 'left', value: 'sales' },
        ],
    };
  },
  async mounted() {

    // determine if user is already logged in
    try {
      let res = await axios.get('/api/getProjects')
      if (res.data) {

        // update the data
        // Icons from https://materialdesignicons.com/
        // @ts-ignore
        res.data.projects.forEach(project => {
          if (project.project_twitter_name) {
            project.twitter_username = project.project_twitter_name.replaceAll("@","")
          }
        })

        // @ts-ignore
        this.projects = res.data.projects
        this.step = 1
      }
    } catch (e) {
      console.log("unable to load projects", e)
      this.step = 2
      return
    }
  },
});
</script>