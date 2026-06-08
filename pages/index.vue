<template>
  <div class="h-screen flex flex-col">
    <!-- Top: editor + preview -->
    <div class="flex-1 grid grid-cols-3 divide-x overflow-hidden">
      <div class="col-span-2 h-full flex flex-col bg-slate-100">
        <div class="flex-1 overflow-y-auto p-8">
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

        <!-- Action bar -->
        <div class="border-t bg-white flex items-center">
          <button
            @click="prefillDemoData"
            class="h-12 flex items-center space-x-2 px-4 border-r text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>Demo</span>
            <icon name="mdi:code-json" class="h-4 w-4" />
          </button>
          <button
            @click="saveProfile"
            :disabled="saving"
            class="h-12 flex items-center space-x-2 px-4 border-r text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <span>{{ saving ? 'Guardando...' : (editingId ? 'Guardar' : 'Guardar nuevo') }}</span>
            <icon name="ph:floppy-disk-duotone" class="h-4 w-4" />
          </button>
          <button
            v-if="editingId"
            @click="copyUrl"
            class="h-12 flex items-center space-x-2 px-4 border-r text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>Copiar URL</span>
            <icon name="ph:link-duotone" class="h-4 w-4" />
          </button>
          <button
            @click="signOut"
            class="h-12 flex items-center space-x-2 px-4 text-xs font-medium text-slate-500 hover:bg-slate-50 ml-auto"
          >
            <span>Salir</span>
            <icon name="ph:sign-out-duotone" class="h-4 w-4" />
          </button>
          <a
            href="https://github.com/Matute289/onelink_claude"
            target="_blank"
            class="h-12 flex items-center space-x-2 px-4 border-l text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <icon name="mdi:github" class="h-4 w-4" />
          </a>
        </div>
      </div>
      <app-form-preview :data="data" />
    </div>

    <!-- Bottom: Mis perfiles panel -->
    <div class="h-48 border-t bg-white flex flex-col">
      <div class="flex items-center justify-between px-6 py-3 border-b">
        <h2 class="text-sm font-semibold text-slate-700">Mis perfiles</h2>
        <button
          @click="newProfile"
          class="flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-slate-900 border rounded-md px-3 py-1.5 hover:bg-slate-50"
        >
          <icon name="ph:plus-bold" class="h-3.5 w-3.5" />
          <span>Nuevo</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="!profiles?.length" class="flex items-center justify-center h-full text-sm text-slate-400">
          No tenés perfiles todavía. Completá el formulario y guardá.
        </div>
        <table v-else class="w-full text-sm">
          <tbody>
            <tr
              v-for="profile in (profiles ?? [])"
              :key="profile.id"
              class="border-b last:border-0 hover:bg-slate-50"
            >
              <td class="px-6 py-2 font-medium text-slate-700">{{ profile.title }}</td>
              <td class="px-2 py-2 text-xs text-slate-400">
                {{ new Date(profile.created_at).toLocaleDateString('es-AR') }}
              </td>
              <td class="px-4 py-2 text-right space-x-2">
                <button
                  @click="loadProfile(profile)"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                >Editar</button>
                <button
                  @click="copyProfileUrl(profile.id)"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                >URL</button>
                <button
                  @click="deleteProfile(profile.id)"
                  class="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                >Borrar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
const EMPTY_DATA = () => ({
  n: '', d: '', i: '',
  f: '', t: '', ig: '', gh: '', tg: '', l: '', e: '', w: '', y: '',
  ls: [],
})

const data = ref(EMPTY_DATA())
const editingId = ref(null)
const saving = ref(false)

const { data: profiles, refresh: refreshProfiles } = await useFetch('/api/profiles')

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
  await $fetch('/api/auth/sign-out', { method: 'POST' })
  navigateTo('/login')
}
</script>
