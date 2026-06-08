<template>
  <div class="mb-6">
    <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ title }}</h3>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>
