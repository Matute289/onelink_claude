<template>
  <div class="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-fuchsia-100">
    <templates-simple v-if="profile" :acc="profile.data" />
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const route = useRoute()
const { data: profile, error } = await useAsyncData(
  `profile-${route.params.id}`,
  () => $fetch(`/api/profile/${route.params.id}`)
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })
}
</script>
