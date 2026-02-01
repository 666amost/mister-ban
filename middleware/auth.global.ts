export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") return;

  const me = useMe();
  if (!me.user.value) {
    try {
      await me.refresh();
    } catch {
      return navigateTo("/login");
    }
  }

  if (me.user.value?.role === "STAFF") {
    return;
  }

  if (to.path === "/select-store") return;

  const storeContext = useStoreContext();
  if (storeContext.store.value) {
    return;
  }

  try {
    await storeContext.refresh();
    if (!storeContext.store.value) {
      return navigateTo("/select-store");
    }
  } catch {
    return navigateTo("/select-store");
  }
});
