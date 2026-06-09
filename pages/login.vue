<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Background: live preview of a onelink profile -->
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <templates-simple :acc="demoProfile" />
    </div>

    <!-- Soft overlay so the card is readable without hiding the demo -->
    <div class="absolute inset-0 bg-white/55" />

    <!-- Login card + tagline -->
    <div class="relative min-h-screen flex flex-col items-center justify-center p-4 gap-5">
      <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-6">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-slate-800">Onelink</h1>
          <p class="text-sm text-slate-500 mt-1">Sign in to continue</p>
        </div>

        <div class="space-y-3">
          <button
            v-for="provider in providers"
            :key="provider.id"
            :disabled="loading"
            class="flex items-center justify-center space-x-3 w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            @click="signIn(provider.id)"
          >
            <icon :name="provider.icon" class="h-5 w-5" />
            <span>Continue with {{ provider.label }}</span>
          </button>
        </div>
      </div>

      <p class="text-center text-sm font-semibold text-slate-700 drop-shadow-sm">
        All your links in one place — one URL to share everything
      </p>
    </div>
  </div>
</template>

<script setup>
import { createAuthClient } from 'better-auth/client'

definePageMeta({ layout: false })

const authClient = createAuthClient()
const loading = ref(false)

const providers = [
  { id: 'google',   label: 'Google',  icon: 'mdi:google' },
  { id: 'github',   label: 'GitHub',  icon: 'mdi:github' },
  { id: 'discord',  label: 'Discord', icon: 'ic:baseline-discord' },
  { id: 'twitter',  label: 'X',       icon: 'mdi:twitter' },
]

const demoProfile = {
  n: 'Jane Doe',
  d: 'Designer · Developer · Creator',
  i: 'https://i.pravatar.cc/150?img=47',
  t: 'https://twitter.com/janedoe',
  ig: 'https://instagram.com/janedoe',
  gh: 'https://github.com/janedoe',
  l: 'https://linkedin.com/in/janedoe',
  y: 'https://youtube.com/@janedoe',
  e: 'hi@janedoe.com',
  ls: [
    { l: 'My Portfolio', i: 'ph:globe-duotone', u: 'https://janedoe.com' },
    { l: 'Latest Article', i: 'ph:newspaper-duotone', u: 'https://blog.janedoe.com' },
    { l: 'Book a call', i: 'ph:calendar-duotone', u: 'https://cal.com/janedoe' },
  ],
}

async function signIn(provider) {
  loading.value = true
  await authClient.signIn.social({ provider, callbackURL: '/' })
}
</script>
