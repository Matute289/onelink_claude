<template>
  <base-form-section title="Other Links">
    <template #description>
      Find icons at <a class="underline" href="https://icones.js.org/" target="_blank">icones.js.org</a>
    </template>
    <draggable :list="modelValue" item-key="link" ghost-class="ghost" handle=".drag-handle">
      <template #item="{ element: link }">
        <div class="relative mb-4 group">
          <button
            @click="removeLink(link)"
            class="hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-slate-300 text-slate-600 absolute -right-2 -top-2 z-10"
          >
            <icon name="fluent:dismiss-24-regular" class="h-3 w-3" />
          </button>
          <div class="shadow sm:overflow-hidden sm:rounded-md bg-white px-4 py-4 sm:px-6">
            <div class="flex items-center gap-2 mb-3">
              <icon name="radix-icons:drag-handle-dots-2" class="h-5 w-5 text-slate-400 drag-handle cursor-grab" />
              <span class="text-xs text-slate-400">Drag to reorder</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Icon (optional)</label>
                <input
                  type="text"
                  v-model="link.i"
                  placeholder="ph:globe-duotone"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  v-model="link.l"
                  placeholder="My site"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  v-model="link.u"
                  placeholder="https://example.com"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <p class="mt-2 text-xs text-center text-slate-400" v-if="!link.l || !link.u">
              Link shows in preview once label and URL are filled
            </p>
          </div>
        </div>
      </template>
    </draggable>

    <button
      @click="appendLink"
      class="mt-2 border-2 border-dashed text-slate-400 border-slate-300 rounded-lg block w-full py-2 hover:border-slate-400 hover:text-slate-500 transition-colors"
    >
      <icon name="fluent:add-circle-24-regular" class="h-5 w-5 mx-auto" />
    </button>
  </base-form-section>
</template>

<script setup>
import draggable from 'vuedraggable'

const emit = defineEmits(['update:modelValue'])
const props = defineProps({ modelValue: Array })

const appendLink = () => {
  props.modelValue.push({ i: '', l: '', u: '' })
  emit('update:modelValue', props.modelValue)
}

const removeLink = (link) => {
  const index = props.modelValue.indexOf(link)
  props.modelValue.splice(index, 1)
  emit('update:modelValue', props.modelValue)
}
</script>

<style scoped>
.ghost { opacity: 0.5; background: #c8ebfb; }
</style>
