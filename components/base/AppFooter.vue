<template>
    <div class="twitter text-sm text-gray-600">
        Free Solana tools by <a class="underline" :href="'https://twitter.com/'+this.$config.twitter_handle">@{{ this.$config.twitter_handle }}</a>
        <br>
        <a :href="'https://twitter.com/'+this.$config.twitter_handle"><v-icon>mdi-twitter</v-icon></a>
        <a :href="'https://discord.gg/'+this.$config.discord_invite""><v-icon>mdi-discord</v-icon></a>
        <a href="https://github.com/qrtp/solana-project-tools"><v-icon>mdi-github</v-icon></a>
    </div>
</template>

<style>
    .twitter { 
        text-align: center; 
    }
</style>
