<template>
  <div class="mb-8">
    <h3 class="text-base font-semibold text-gray-800 mb-1">{{ title }}</h3>
    <p v-if="description || $slots.description" class="text-xs text-gray-500 mb-3">
      <slot name="description">{{ description }}</slot>
    </p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>
