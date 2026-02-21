import { useRequestFetch } from '#app'

type MeUser = {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF";
  store_id: string | null;
};

export function useMe() {
  const user = useState<MeUser | null>("me:user", () => null);
  const status = useState<"idle" | "loading" | "ready" | "error">(
    "me:status",
    () => "idle",
  );

  async function refresh() {
    status.value = "loading";
    try {
      const fetcher = import.meta.server ? useRequestFetch() : $fetch;
      const res = await fetcher<{ user: MeUser }>("/api/me");
      user.value = res.user;
      status.value = "ready";
      return res.user;
    } catch (error) {
      user.value = null;
      status.value = "error";
      throw error;
    }
  }

  function clear() {
    user.value = null;
    status.value = "idle";
  }

  return { user, status, refresh, clear };
}
