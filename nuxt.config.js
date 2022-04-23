export default {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: process.env.PRODUCT_NAME || 'NFT 4 Cause | Solana Tools',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { content: "NFT 4 Cause | Solana Tools", property: "og:site_name" },
      { content: "Free NFT Project Tools", property: "og:title" },
      { content: "Verify Discord users hold your NFT, sales bots for your social channels, DAO voting and more. Services provided by NFT 4 Cause, where 80% of our proceeds are donated to global nonprofits! Everything else funds the development of tools like this to enhance the Solana community.", property: "og:description" },
      { content: "https://www.nft4cause.app/img/nft4c-governance-token.png", property: "og:image" }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  server: {
    port: process.env.PORT || 3000
  },
  serverMiddleware: [
    { path: '/api', handler: './server-middleware/api' },
    { path: '/api/twitter', handler: './server-middleware/twitter' }
  ],
  publicRuntimeConfig: {
    message: process.env.MESSAGE,
    project_name: process.env.PRODUCT_NAME,
    upgrade_url: process.env.UPGRADE_URL,
    about_url: process.env.ABOUT_URL,
    twitter_enabled: process.env.TWITTER_ENABLED,
    max_free_verifications: parseInt(process.env.MAX_FREE_VERIFICATIONS)
  }
  ,
  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/typescript
    '@nuxt/typescript-build',
    // https://github.com/nuxt-community/vuetify-module
    '@nuxtjs/vuetify',
    // https://go.nuxtjs.dev/tailwindcss
    '@nuxtjs/tailwindcss',
  ],

  vuetify: {
    optionsPath: './vuetify.options.js',
    treeShake: true,
  },

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
  }
}
