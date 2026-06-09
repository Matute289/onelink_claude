<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Action bar -->
    <div class="shrink-0 bg-white border-b flex items-center h-12">
      <button
        @click="prefillDemoData"
        class="h-full flex items-center gap-1.5 px-3 border-r text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <icon name="mdi:code-json" class="h-4 w-4" />
        <span class="hidden sm:inline">Demo</span>
      </button>
      <button
        @click="saveProfile"
        :disabled="saving"
        class="h-full flex items-center gap-1.5 px-3 border-r text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <icon name="ph:floppy-disk-duotone" class="h-4 w-4" />
        <span>{{ saving ? 'Guardando...' : 'Guardar Onelink' }}</span>
      </button>
      <button
        v-if="editingId"
        @click="copyUrl"
        class="h-full flex items-center gap-1.5 px-3 border-r text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <icon name="ph:link-duotone" class="h-4 w-4" />
        <span class="hidden sm:inline">Copiar URL</span>
      </button>

      <!-- User menu -->
      <!-- Mis perfiles button (outside menu, pushed to right) -->
      <button
        @click="profilesOpen = true"
        class="ml-auto h-full flex items-center gap-1.5 px-3 border-l text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <icon name="ph:list-duotone" class="h-4 w-4" />
        <span class="hidden sm:inline">Mis perfiles</span>
        <span v-if="profiles?.length" class="bg-slate-100 rounded-full px-1.5 py-0.5 leading-none">{{ profiles.length }}</span>
      </button>

      <!-- User menu -->
      <div class="h-full flex items-center border-l relative" ref="menuRef">
        <button
          @click="menuOpen = !menuOpen"
          class="h-full flex items-center gap-2 px-3 hover:bg-slate-50"
        >
          <img
            v-if="session?.user?.image"
            :src="session.user.image"
            class="h-6 w-6 rounded-full object-cover shrink-0"
            :alt="session?.user?.name"
          />
          <icon v-else name="ph:user-circle-duotone" class="h-5 w-5 text-slate-400 shrink-0" />
          <span class="text-xs font-medium text-slate-700 max-w-32 truncate">{{ session?.user?.name }}</span>
          <icon name="ph:caret-down-bold" class="h-3 w-3 text-slate-400 shrink-0" />
        </button>

        <Transition
          enter-active-class="transition-all duration-150"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-100"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-if="menuOpen" class="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
            <div class="px-4 py-2.5 border-b">
              <p class="text-sm font-medium text-slate-700 truncate">{{ session?.user?.name }}</p>
              <p class="text-xs text-slate-400 truncate">{{ session?.user?.email }}</p>
            </div>
            <div v-if="currentProfileTitle" class="px-4 py-2 border-b flex items-center gap-2 text-xs text-slate-500 bg-slate-50">
              <icon name="ph:pencil-simple-duotone" class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{{ currentProfileTitle }}</span>
            </div>
            <a
              href="https://github.com/Matute289/onelink_claude"
              target="_blank"
              @click="menuOpen = false"
              class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
            >
              <icon name="mdi:github" class="h-4 w-4 text-slate-400" />
              Ver proyecto
            </a>
            <div class="border-t my-1" />
            <button
              @click="signOut"
              class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5"
            >
              <icon name="ph:sign-out-duotone" class="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Content: form + preview -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <div class="flex-1 min-w-0 overflow-y-auto bg-slate-100 p-6 md:p-8">
        <app-form-profile
          v-model:name="data.n"
          v-model:desc="data.d"
          v-model:image="data.i"
        />
        <app-form-hr />
        <app-form-social-links
          v-model:facebook="data.f"
          v-model:twitter="data.t"
          v-model:instagram="data.ig"
          v-model:github="data.gh"
          v-model:telegram="data.tg"
          v-model:linkedin="data.l"
          v-model:email="data.e"
          v-model:whatsapp="data.w"
          v-model:youtube="data.y"
        />
        <app-form-hr />
        <app-form-links v-model="data.ls" />
      </div>

      <div class="hidden lg:block w-80 xl:w-96 shrink-0 border-l overflow-hidden">
        <app-form-preview :data="data" />
      </div>
    </div>

    <!-- Profiles slide-over panel -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="profilesOpen" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/40" @click="profilesOpen = false" />
          <Transition
            enter-active-class="transition-transform duration-200"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition-transform duration-150"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
          >
            <div v-if="profilesOpen" class="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col">
              <div class="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <h2 class="text-sm font-semibold text-slate-700">Mis perfiles</h2>
                <div class="flex items-center gap-2">
                  <button
                    @click="newProfile(); profilesOpen = false"
                    class="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 border rounded-md px-2.5 py-1.5 hover:bg-slate-50"
                  >
                    <icon name="ph:plus-bold" class="h-3 w-3" />
                    Nuevo
                  </button>
                  <button @click="profilesOpen = false" class="p-1 rounded hover:bg-slate-100 text-slate-500">
                    <icon name="ph:x-bold" class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto">
                <div v-if="!profiles?.length" class="flex flex-col items-center justify-center h-full gap-3 text-sm text-slate-400 p-8 text-center">
                  <icon name="ph:link-duotone" class="h-10 w-10 opacity-40" />
                  <p>No tenés perfiles todavía.<br>Completá el formulario y guardá.</p>
                </div>
                <div v-else class="divide-y">
                  <div
                    v-for="profile in profiles"
                    :key="profile.id"
                    class="px-4 py-3 hover:bg-slate-50"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-slate-700 truncate">{{ profile.title }}</p>
                        <p class="text-xs text-slate-400">{{ new Date(profile.created_at).toLocaleDateString('es-AR') }}</p>
                      </div>
                      <div class="flex items-center gap-1 shrink-0">
                        <button @click="loadProfile(profile); profilesOpen = false" class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">Editar</button>
                        <button @click="copyProfileUrl(profile.id)" class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">URL</button>
                        <button @click="deleteProfile(profile.id)" class="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">Borrar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core'
import { createAuthClient } from 'better-auth/client'

const authClient = createAuthClient()

const EMPTY_DATA = () => ({
  n: '', d: '', i: '',
  f: '', t: '', ig: '', gh: '', tg: '', l: '', e: '', w: '', y: '',
  ls: [],
})

const data = ref(EMPTY_DATA())
const editingId = ref(null)
const saving = ref(false)
const profilesOpen = ref(false)
const menuOpen = ref(false)
const menuRef = ref(null)

onClickOutside(menuRef, () => { menuOpen.value = false })

const [{ data: profiles, refresh: refreshProfiles }, { data: session }] = await Promise.all([
  useFetch('/api/profiles'),
  useFetch('/api/auth/get-session'),
])

const currentProfileTitle = computed(() =>
  editingId.value ? profiles.value?.find(p => p.id === editingId.value)?.title : null
)

async function saveProfile() {
  if (!data.value.n && !data.value.d) {
    alert('Completá al menos el nombre o la descripción.')
    return
  }
  const title = prompt('Título para este perfil (ej: Laboral, Hobbies):', editingId.value
    ? profiles.value?.find(p => p.id === editingId.value)?.title ?? ''
    : '')
  if (!title) return

  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/profiles/${editingId.value}`, {
        method: 'PUT',
        body: { title, data: data.value },
      })
    } else {
      const result = await $fetch('/api/profiles', {
        method: 'POST',
        body: { title, data: data.value },
      })
      editingId.value = result.id
    }
    await refreshProfiles()
  } finally {
    saving.value = false
  }
}

function copyUrl() {
  if (!editingId.value) return
  copyProfileUrl(editingId.value)
}

function copyProfileUrl(id) {
  const url = `${window.location.origin}/p/${id}`
  navigator.clipboard.writeText(url).then(() => alert('URL copiada al clipboard'))
}

async function loadProfile(profile) {
  const full = await $fetch(`/api/profile/${profile.id}`)
  data.value = { ...EMPTY_DATA(), ...full.data }
  editingId.value = profile.id
}

async function deleteProfile(id) {
  if (!confirm('¿Seguro que querés borrar este perfil?')) return
  await $fetch(`/api/profiles/${id}`, { method: 'DELETE' })
  if (editingId.value === id) newProfile()
  await refreshProfiles()
}

function newProfile() {
  data.value = EMPTY_DATA()
  editingId.value = null
}

function prefillDemoData() {
  data.value = {
    n: 'John Snow',
    d: "I'm John Snow, the king in the north. I know Nothing.",
    i: 'https://i.insider.com/56743fad72f2c12a008b6cc0',
    f: 'https://www.facebook.com/john_snow',
    t: 'https://twitter.com/john_snow',
    ig: 'https://www.instagram.com/john_snow',
    e: 'mail@john_snow.cc',
    gh: 'https://github.com/john_snow',
    tg: 'https://t.me/john_snow',
    w: '+918888888888',
    y: 'https://youtube.com/@john_snow',
    l: 'https://linkedin.com/john_snow',
    ls: [
      { l: 'My Website', i: 'ph:globe-duotone', u: 'https://example.com' },
    ],
  }
}

async function signOut() {
  await authClient.signOut()
  navigateTo('/login')
}
</script>
