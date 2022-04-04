<template>
  <header class="z-50 w-full shadow-lg bg-white">
    <v-app-bar
      style="
        background: #3a1c71;
        background: -webkit-linear-gradient(300deg, #e66465, #9198e5);
        background: linear-gradient(300deg, #e66465, #9198e5);
      "
      dark
    >
      <v-app-bar-nav-icon @click="drawer = true"></v-app-bar-nav-icon>
      <span class="title text-no-wrap">{{ this.$config.project_name }} | Solana Tools</span>
      <v-spacer></v-spacer>
      <div>
        <div class="flex overflow-hidden transition-height md:h-auto h-0">
          <ul class="flex flex-col list-none md:flex-row">
            <li v-for="route in routes" :key="route.href" class="nowrap py-1 text-right">
              <a :href="route.href" class="px-3 navlink">
                {{ route.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" class="blue-grey darken-4" dark absolute temporary>
      <v-list nav dense>
        <v-list-item-group active-class="white--text text--accent-4">
          <v-list-item v-for="route in mobileRoutes" :key="route.href" :href="route.href" link>
            <v-list-item-icon>
              <v-icon>{{ route.icon }}</v-icon>
            </v-list-item-icon>
            <v-list-item-title>{{ route.label }}</v-list-item-title>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>
  </header>
</template>

<script>
export default {
  data() {
    return { 
      drawer: false,
      routes: [ 
        { href: "/manage", label: "Manage" },
        { href: "/projects", label: "Leaderboard" },
        { href: this.$config.upgrade_url, label: "Donate!" }
      ],
      mobileRoutes: [
        { icon: "mdi-home", href: "/", label: "Home" },
        { icon: "mdi-cog", href: "/manage", label: "Manage" },
        { icon: "mdi-file-document", href: "https://github.com/qrtp/solana-project-tools/wiki", label: "Documentation" },
        { icon: "mdi-table", href: "/projects", label: "Leaderboard" },
        { icon: "mdi-information", href: this.$config.about_url, label: "About the team" },
        { icon: "mdi-hand-coin", href: this.$config.upgrade_url, label: "Donate!" }
      ]
    };
  }
};
</script>
<style>
  .title {
    @apply text-white text-lg font-semibold
  }
  .hyperlink {
    @apply text-base font-bold
  }
  .hyperlink:link{
    @apply text-base font-bold
  }
  .hyperlink:hover{
    @apply text-base underline font-bold
  }
  .hyperlink:visited {
    @apply text-base font-bold
  }


  .navlink {
    @apply text-white text-base font-bold
  }
  .navlink:link{
    @apply text-white text-base font-bold
  }
  .navlink:hover{
    @apply text-white text-base underline font-bold
  }
  .navlink:visited {
    @apply text-white text-base font-bold
  }
  .titleWidth{
  width: 400px !important;
}
</style>