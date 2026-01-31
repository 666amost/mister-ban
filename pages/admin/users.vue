<script setup lang="ts">
definePageMeta({ middleware: "admin" })

type Store = { id: string; name: string }
type UserRow = {
  id: string
  email: string
  role: "ADMIN" | "STAFF"
  store_id: string | null
  store_name: string | null
  is_active: boolean
  created_at: string
}

type UiUser = UserRow & {
  roleDraft: "ADMIN" | "STAFF"
  storeIdDraft: string | null
  isActiveDraft: boolean
  saving: boolean
  error: string | null
}

const stores = ref<Store[]>([])
const users = ref<UiUser[]>([])
const q = ref("")

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

async function load() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const [storesRes, usersRes] = await Promise.all([
      $fetch<{ stores: Store[] }>("/api/stores"),
      $fetch<{ items: UserRow[] }>("/api/admin/users"),
    ])
    stores.value = storesRes.stores
    users.value = usersRes.items.map((u) => ({
      ...u,
      roleDraft: u.role,
      storeIdDraft: u.store_id,
      isActiveDraft: u.is_active,
      saving: false,
      error: null,
    }))
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat users"
  } finally {
    isLoading.value = false
  }
}

await load()

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return users.value
  return users.value.filter((u) => u.email.toLowerCase().includes(term))
})

function markRoleChanged(u: UiUser) {
  if (u.roleDraft === "ADMIN") u.storeIdDraft = null
}

async function save(u: UiUser) {
  u.saving = true
  u.error = null
  try {
    const res = await $fetch<{ item: UserRow }>("/api/admin/users/" + u.id, {
      method: "PATCH",
      body: {
        role: u.roleDraft,
        store_id: u.roleDraft === "ADMIN" ? null : u.storeIdDraft,
        is_active: u.isActiveDraft,
      },
    })
    u.role = res.item.role
    u.store_id = res.item.store_id
    u.is_active = res.item.is_active
    u.roleDraft = res.item.role
    u.storeIdDraft = res.item.store_id
    u.isActiveDraft = res.item.is_active
  } catch (error) {
    u.error = statusMessage(error) ?? "Gagal menyimpan"
  } finally {
    u.saving = false
  }
}
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="row">
        <label class="field">
          <span>Cari user</span>
          <input v-model="q" class="mb-input" placeholder="email..." />
        </label>
        <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Refresh" }}</button>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <section class="mb-card">
      <div v-if="filtered.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Store</th>
              <th style="text-align: center">Active</th>
              <th style="width: 1%"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="u in filtered" :key="u.id">
              <tr>
                <td class="mono">{{ u.email }}</td>
                <td>
                  <select v-model="u.roleDraft" class="select" @change="markRoleChanged(u)">
                    <option value="ADMIN">ADMIN</option>
                    <option value="STAFF">STAFF</option>
                  </select>
                </td>
                <td>
                  <select v-model="u.storeIdDraft" class="select" :disabled="u.roleDraft === 'ADMIN'">
                    <option :value="null">-</option>
                    <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </td>
                <td style="text-align: center">
                  <input v-model="u.isActiveDraft" type="checkbox" />
                </td>
                <td style="text-align: right">
                  <button class="mb-btnPrimary" :disabled="u.saving" @click="save(u)">
                    {{ u.saving ? "..." : "Save" }}
                  </button>
                </td>
              </tr>
              <tr v-if="u.error">
                <td colspan="5" class="errRow">{{ u.error }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">Tidak ada data.</div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.row {
  display: flex;
  gap: 12px;
  align-items: end;
  justify-content: space-between;
  flex-wrap: wrap;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  flex: 1;
  min-width: 240px;
}
.tableWrap {
  overflow: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--mb-border2);
}
th {
  text-align: left;
  color: var(--mb-muted);
  font-weight: 700;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
.select {
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--mb-border);
  background: var(--mb-surface);
  color: var(--mb-text);
  padding: 0 10px;
  outline: none;
}
.select:focus {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.empty {
  border-radius: 12px;
  border: 1px dashed var(--mb-border2);
  padding: 14px;
  font-size: 13px;
  color: var(--mb-muted);
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
.errRow {
  padding: 10px 8px;
  color: var(--mb-danger);
  font-size: 12px;
}
</style>
