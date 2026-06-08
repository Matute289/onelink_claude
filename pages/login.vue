<template>
  <div class="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-fuchsia-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-slate-800">Onelink</h1>
        <p class="text-sm text-slate-500 mt-1">Iniciá sesión para continuar</p>
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
          <span>Continuar con {{ provider.label }}</span>
        </button>
      </div>
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

async function signIn(provider) {
  loading.value = true
  await authClient.signIn.social({ provider, callbackURL: '/' })
}
</script>
