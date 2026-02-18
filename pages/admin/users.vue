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
  deleting: boolean
  error: string | null
}

const stores = ref<Store[]>([])
const users = ref<UiUser[]>([])
const q = ref("")
const PASSWORD_MIN_LENGTH = 8

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const currentUserId = ref<string | null>(null)

const showCreateForm = ref(false)
const createForm = ref({
  email: "",
  password: "",
  role: "STAFF" as "ADMIN" | "STAFF",
  store_id: null as string | null,
})
const createLoading = ref(false)
const createError = ref<string | null>(null)
const canSubmitCreate = computed(() => {
  const emailOk = createForm.value.email.trim().length > 0
  const passwordOk = createForm.value.password.length >= PASSWORD_MIN_LENGTH
  const storeOk = createForm.value.role === "ADMIN" || Boolean(createForm.value.store_id)
  return emailOk && passwordOk && storeOk
})

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

async function load() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const [storesRes, usersRes, meRes] = await Promise.all([
      $fetch<{ stores: Store[] }>("/api/stores"),
      $fetch<{ items: UserRow[] }>("/api/admin/users"),
      $fetch<{ user: { id: string } }>("/api/me"),
    ])
    stores.value = storesRes.stores
    currentUserId.value = meRes.user.id
    users.value = usersRes.items.map((u) => ({
      ...u,
      roleDraft: u.role,
      storeIdDraft: u.store_id,
      isActiveDraft: u.is_active,
      saving: false,
      deleting: false,
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

function onCreateRoleChange() {
  if (createForm.value.role === "ADMIN") {
    createForm.value.store_id = null
  }
}

function openCreateForm() {
  showCreateForm.value = true
  createForm.value = { email: "", password: "", role: "STAFF", store_id: null }
  createError.value = null
}

function closeCreateForm() {
  showCreateForm.value = false
  createError.value = null
}

async function createUser() {
  if (createForm.value.password.length < PASSWORD_MIN_LENGTH) {
    createError.value = `Password minimal ${PASSWORD_MIN_LENGTH} karakter`
    return
  }

  createLoading.value = true
  createError.value = null
  try {
    await $fetch("/api/admin/users", {
      method: "POST",
      body: {
        email: createForm.value.email.trim(),
        password: createForm.value.password,
        role: createForm.value.role,
        store_id: createForm.value.role === "ADMIN" ? null : createForm.value.store_id,
      },
    })
    closeCreateForm()
    await load()
  } catch (error) {
    createError.value = statusMessage(error) ?? "Gagal membuat user"
  } finally {
    createLoading.value = false
  }
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

function canDelete(u: UiUser) {
  return u.id !== currentUserId.value
}

async function removeUser(u: UiUser) {
  if (!canDelete(u)) {
    u.error = "Tidak bisa menghapus akun sendiri"
    return
  }

  const ok = confirm(`Hapus user ${u.email}?`)
  if (!ok) return

  u.deleting = true
  u.error = null
  try {
    await $fetch("/api/admin/users/" + u.id, { method: "DELETE" })
    users.value = users.value.filter((x) => x.id !== u.id)
  } catch (error) {
    u.error = statusMessage(error) ?? "Gagal menghapus user"
  } finally {
    u.deleting = false
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
        <div class="headerActions">
          <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Refresh" }}</button>
          <button class="mb-btnPrimary" @click="openCreateForm">+ Tambah User</button>
        </div>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <Transition name="slide">
      <section v-if="showCreateForm" class="mb-card createCard">
        <h3 class="createTitle">Tambah User Baru</h3>
        <div class="createForm">
          <label class="field">
            <span>Email</span>
            <input v-model="createForm.email" class="mb-input" type="email" placeholder="user@example.com" />
          </label>
          <label class="field">
            <span>Password</span>
            <input
              v-model="createForm.password"
              class="mb-input"
              type="password"
              :minlength="PASSWORD_MIN_LENGTH"
              :placeholder="`minimal ${PASSWORD_MIN_LENGTH} karakter`"
            />
            <small class="hint"> Minimal {{ PASSWORD_MIN_LENGTH }} karakter agar bisa login.</small>
          </label>
          <label class="field">
            <span>Role</span>
            <select v-model="createForm.role" class="select" @change="onCreateRoleChange">
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
            </select>
          </label>
          <label class="field">
            <span>Store</span>
            <select v-model="createForm.store_id" class="select" :disabled="createForm.role === 'ADMIN'">
              <option :value="null">- Pilih store -</option>
              <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
        </div>
        <p v-if="createError" class="error">{{ createError }}</p>
        <div class="createActions">
          <button class="mb-btn" @click="closeCreateForm">Batal</button>
          <button class="mb-btnPrimary" :disabled="createLoading || !canSubmitCreate" @click="createUser">
            {{ createLoading ? "Menyimpan..." : "Simpan" }}
          </button>
        </div>
      </section>
    </Transition>

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
                  <div class="actions">
                    <button class="mb-btnPrimary" :disabled="u.saving || u.deleting" @click="save(u)">
                      {{ u.saving ? "..." : "Save" }}
                    </button>
                    <button
                      class="mb-btnDanger"
                      :disabled="u.saving || u.deleting || !canDelete(u)"
                      :title="!canDelete(u) ? 'Tidak bisa hapus akun sendiri' : undefined"
                      @click="removeUser(u)"
                    >
                      {{ u.deleting ? "..." : "Hapus" }}
                    </button>
                  </div>
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
.headerActions {
  display: flex;
  gap: 8px;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  flex: 1;
  min-width: 240px;
}
.createCard {
  border: 1px solid var(--mb-accent);
}
.createTitle {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
}
.createForm {
  display: grid;
  gap: 12px;
}
.createActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.hint {
  font-size: 11px;
  color: var(--mb-muted);
}
.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.tableWrap {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.table {
  width: max-content;
  min-width: 100%;
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

@media (max-width: 900px) {
  .headerActions {
    width: 100%;
  }

  .headerActions .mb-btn,
  .headerActions .mb-btnPrimary {
    flex: 1 1 0;
    min-width: 0;
  }

  .table {
    min-width: 820px;
  }

  .actions .mb-btnPrimary,
  .actions .mb-btnDanger {
    height: 34px;
    font-size: 12px;
    padding: 0 10px;
  }
}
</style>
