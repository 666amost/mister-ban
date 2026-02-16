export default defineNuxtRouteMiddleware(async (to) => {
  const me = useMe();
  const storeContext = useStoreContext();

  if (to.path === "/login") {
    try {
      const freshUser = await me.refresh();
      if (freshUser.role === "STAFF") return navigateTo("/");

      if (!storeContext.store.value) {
        await storeContext.refresh();
      }

      return navigateTo(storeContext.store.value ? "/" : "/select-store");
    } catch {
      me.clear();
      storeContext.clear();
      return;
    }
  }

  async function resolveUser() {
    if (me.user.value) return me.user.value;
    try {
      return await me.refresh();
    } catch {
      return null;
    }
  }

  const user = await resolveUser();

  if (!user) {
    storeContext.clear();
    return navigateTo("/login");
  }
  if (user.role === "STAFF") return;
  if (to.path === "/select-store") return;

  if (storeContext.store.value) return;

  try {
    await storeContext.refresh();
    if (!storeContext.store.value) {
      return navigateTo("/select-store");
    }
  } catch {
    return navigateTo("/select-store");
  }
});
