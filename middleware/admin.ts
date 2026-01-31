export default defineNuxtRouteMiddleware(() => {
  const me = useMe()
  if (me.user.value?.role !== "ADMIN") return navigateTo("/")
})

