<template>
  <div class="h-screen overflow-hidden bg-slate-900 flex flex-col lg:flex-row">

    <!-- Top (mobile) / Left (desktop): animated live demo -->
    <div class="flex-1 overflow-hidden flex flex-col items-center justify-center gap-3 py-4 px-4 lg:gap-8 lg:p-12">
      <div
        class="transition-opacity duration-500"
        :class="isResetting ? 'opacity-0' : 'opacity-100'"
      >
        <!-- Phone frame -->
        <div class="w-[230px] lg:w-[340px] rounded-[2.5rem] lg:rounded-[3rem] ring-6 lg:ring-8 ring-slate-600 bg-gradient-to-b from-amber-50 via-rose-50 to-fuchsia-100 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
          <div class="px-5 pt-8 pb-5 space-y-3 lg:px-6 lg:pt-12 lg:pb-8 lg:space-y-5">
            <!-- Avatar -->
            <Transition
              enter-active-class="transition-all duration-700 ease-out"
              enter-from-class="opacity-0 scale-50"
              enter-to-class="opacity-100 scale-100"
            >
              <div v-if="step >= 1" class="flex justify-center">
                <img
                  src="https://i.pravatar.cc/150?img=47"
                  class="h-14 w-14 lg:h-20 lg:w-20 rounded-full object-cover ring-2 lg:ring-4 ring-white shadow-md"
                  alt="demo avatar"
                />
              </div>
            </Transition>

            <!-- Name -->
            <Transition
              enter-active-class="transition-all duration-500 ease-out"
              enter-from-class="opacity-0 translate-y-3"
              enter-to-class="opacity-100 translate-y-0"
            >
              <h1 v-if="step >= 2" class="text-base lg:text-xl font-bold text-center text-slate-800">Jane Doe</h1>
            </Transition>

            <!-- Description -->
            <Transition
              enter-active-class="transition-all duration-500 ease-out"
              enter-from-class="opacity-0 translate-y-3"
              enter-to-class="opacity-100 translate-y-0"
            >
              <p v-if="step >= 3" class="text-[11px] lg:text-xs text-center text-slate-500">Designer · Developer · Creator</p>
            </Transition>

            <!-- Social icons -->
            <div class="flex justify-center gap-3 lg:gap-4 min-h-[22px] lg:min-h-[28px]">
              <Transition
                v-for="(social, i) in socials"
                :key="social.icon"
                enter-active-class="transition-all duration-400 ease-out"
                enter-from-class="opacity-0 scale-0"
                enter-to-class="opacity-100 scale-100"
              >
                <icon v-if="step >= 4 + i" :name="social.icon" class="h-5 w-5 text-slate-600" />
              </Transition>
            </div>

            <!-- Custom links -->
            <TransitionGroup
              tag="ul"
              class="space-y-2"
              enter-active-class="transition-all duration-500 ease-out"
              enter-from-class="opacity-0 translate-x-6"
              enter-to-class="opacity-100 translate-x-0"
            >
              <li
                v-for="link in visibleLinks"
                :key="link.label"
                class="bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 lg:px-4 lg:py-3 flex items-center gap-2 lg:gap-3 shadow-sm text-xs lg:text-sm font-medium text-slate-700"
              >
                <icon :name="link.icon" class="h-3.5 w-3.5 lg:h-4 lg:w-4 shrink-0 text-slate-500" />
                {{ link.label }}
              </li>
            </TransitionGroup>
          </div>
        </div>
      </div>

      <p class="hidden lg:block text-white/60 text-center text-sm font-medium tracking-wide max-w-xs">
        All your links in one place — one URL to share everything
      </p>
    </div>

    <!-- Bottom (mobile) / Right (desktop): login card -->
    <div class="flex-1 flex items-center justify-center p-6 overflow-y-auto lg:p-8">
      <div class="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 w-full max-w-sm space-y-5 lg:space-y-6">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-slate-800">Onelink</h1>
          <p class="text-sm text-slate-500 mt-1">Sign in to continue</p>
        </div>

        <div class="space-y-3">
          <button
            v-for="provider in providers"
            :key="provider.id"
            :disabled="loading"
            class="flex items-center justify-center space-x-3 w-full border border-slate-200 rounded-lg px-4 py-2.5 lg:py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            @click="signIn(provider.id)"
          >
            <icon :name="provider.icon" class="h-5 w-5" />
            <span>Continue with {{ provider.label }}</span>
          </button>
        </div>

        <p class="lg:hidden text-center text-xs text-slate-400">
          All your links in one place — one URL to share everything
        </p>
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

const socials = [
  { icon: 'ph:github-logo-duotone' },
  { icon: 'ph:instagram-logo-duotone' },
  { icon: 'ph:twitter-logo-duotone' },
]

const allLinks = [
  { label: 'My Portfolio',   icon: 'ph:globe-duotone' },
  { label: 'Latest Article', icon: 'ph:newspaper-duotone' },
  { label: 'Book a call',    icon: 'ph:calendar-duotone' },
]

// step 1=avatar 2=name 3=desc 4-6=socials 7-9=links
const TOTAL_STEPS = 9
const HOLD_STEPS  = 6

const step        = ref(0)
const isResetting = ref(false)

const visibleLinks = computed(() =>
  allLinks.filter((_, i) => step.value >= 7 + i)
)

let timer = null

function startAnimation() {
  timer = setInterval(async () => {
    step.value++
    if (step.value >= TOTAL_STEPS + HOLD_STEPS) {
      clearInterval(timer)
      isResetting.value = true
      await new Promise(r => setTimeout(r, 550))
      step.value = 0
      isResetting.value = false
      startAnimation()
    }
  }, 750)
}

onMounted(startAnimation)
onUnmounted(() => clearInterval(timer))

async function signIn(provider) {
  loading.value = true
  await authClient.signIn.social({ provider, callbackURL: '/' })
}
</script>
