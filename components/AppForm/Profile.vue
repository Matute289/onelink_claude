<template>
  <base-form-section title="Profile" description="Some public information about you">
    <div class="shadow sm:overflow-hidden sm:rounded-md">
      <div class="space-y-6 bg-white px-4 py-5 sm:p-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            id="name"
            autocomplete="given-name"
            :value="name"
            @input="$emit('update:name', $event.target.value)"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label for="about" class="block text-sm font-medium text-gray-700">About yourself</label>
          <textarea
            id="about"
            name="about"
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm placeholder-slate-400"
            placeholder="I am an astronaut"
            maxlength="100"
            :value="desc"
            @input="$emit('update:desc', $event.target.value)"
          />
        </div>

        <div>
          <label for="photo-url" class="block text-sm font-medium text-gray-700">Photo</label>
          <input
            type="text"
            name="photo-url"
            id="photo-url"
            placeholder="https://..."
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            :value="image"
            @input="$emit('update:image', $event.target.value)"
          />
          <div class="mt-2 flex items-center gap-3">
            <label class="cursor-pointer flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border rounded-md px-2.5 py-1.5 hover:bg-slate-50 transition-colors">
              <icon name="ph:upload-simple-duotone" class="h-3.5 w-3.5" />
              Subir foto
              <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
            </label>
            <span v-if="uploadError" class="text-xs text-red-500">{{ uploadError }}</span>
            <span v-else class="text-xs text-slate-400">o pegá una URL arriba</span>
          </div>
        </div>
      </div>
    </div>
  </base-form-section>
</template>

<script setup>
const props = defineProps(['name', 'desc', 'image'])
const emit = defineEmits(['update:name', 'update:desc', 'update:image'])

const uploadError = ref(null)
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

function handleFileUpload(event) {
  uploadError.value = null
  const file = event.target.files[0]
  if (!file) return
  if (file.size > MAX_SIZE) {
    uploadError.value = 'La imagen no puede superar 2MB'
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => emit('update:image', e.target.result)
  reader.readAsDataURL(file)
}
</script>
