export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon', '@vueuse/nuxt'],
  build: {
    transpile: ['@headlessui/vue'],
  },
  colorMode: {
    classSuffix: '',
  },
  runtimeConfig: {
    databaseUrl: '',
    betterAuthSecret: '',
    betterAuthUrl: '',
    googleClientId: '',
    googleClientSecret: '',
    githubClientId: '',
    githubClientSecret: '',
    discordClientId: '',
    discordClientSecret: '',
    twitterClientId: '',
    twitterClientSecret: '',
    facebookClientId: '',
    facebookClientSecret: '',
  },
})
