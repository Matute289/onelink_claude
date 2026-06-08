export default defineNuxtRouteMiddleware(async (to) => {
  const PUBLIC_PATHS = ['/login']
  const PUBLIC_PREFIXES = ['/p/']

  if (
    PUBLIC_PATHS.includes(to.path) ||
    PUBLIC_PREFIXES.some((prefix) => to.path.startsWith(prefix))
  ) {
    return
  }

  const session = await $fetch('/api/auth/get-session', {
    headers: useRequestHeaders(['cookie']),
  }).catch(() => null)

  if (!session?.user) {
    return navigateTo('/login')
  }
})
