type StoreContext = {
  id: string;
  name: string;
};

export function useStoreContext() {
  const store = useState<StoreContext | null>("store:current", () => null);
  const status = useState<"idle" | "loading" | "ready" | "error">(
    "store:status",
    () => "idle",
  );

  async function refresh() {
    status.value = "loading";
    try {
      const res = await $fetch<{ store: StoreContext | null }>(
        "/api/store/current",
      );
      store.value = res.store;
      status.value = "ready";
      return res.store;
    } catch (error) {
      status.value = "error";
      throw error;
    }
  }

  async function select(storeId: string) {
    await $fetch("/api/store/select", {
      method: "POST",
      body: { store_id: storeId },
    });
    return refresh();
  }

  return { store, status, refresh, select };
}
