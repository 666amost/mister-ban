<script setup lang="ts">
definePageMeta({ middleware: "admin" })

type SupplierRow = {
  id: string
  name: string
  phone: string | null
  created_at: string
}

const q = ref("")
const items = ref<SupplierRow[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const createName = ref("")
const createPhone = ref("")
const createLoading = ref(false)

const editingId = ref<string | null>(null)
const editName = ref("")
const editPhone = ref("")
const editLoading = ref(false)

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

async function load() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: SupplierRow[] }>("/api/suppliers", {
      query: { q: q.value.trim() || undefined, limit: 200 },
    })
    items.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat supplier"
  } finally {
    isLoading.value = false
  }
}

async function createSupplier() {
  errorMessage.value = null
  if (!createName.value.trim()) {
    errorMessage.value = "Nama supplier wajib diisi"
    return
  }

  createLoading.value = true
  try {
    await $fetch("/api/suppliers", {
      method: "POST",
      body: {
        name: createName.value.trim(),
        phone: createPhone.value.trim() ? createPhone.value.trim() : null,
      },
    })
    createName.value = ""
    createPhone.value = ""
    await load()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal menambah supplier"
  } finally {
    createLoading.value = false
  }
}

function startEdit(s: SupplierRow) {
  editingId.value = s.id
  editName.value = s.name
  editPhone.value = s.phone ?? ""
}

function cancelEdit() {
  editingId.value = null
  editName.value = ""
  editPhone.value = ""
}

async function saveEdit() {
  if (!editingId.value) return
  errorMessage.value = null
  if (!editName.value.trim()) {
    errorMessage.value = "Nama supplier wajib diisi"
    return
  }

  editLoading.value = true
  try {
    await $fetch(`/api/suppliers/${editingId.value}`, {
      method: "PATCH",
      body: {
        name: editName.value.trim(),
        phone: editPhone.value.trim() ? editPhone.value.trim() : null,
      },
    })
    cancelEdit()
    await load()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal update supplier"
  } finally {
    editLoading.value = false
  }
}

await load()

watch(q, () => {
  if (typeof window === "undefined") return
  clearTimeout((window as unknown as { __mbSuppliersSearchT?: number }).__mbSuppliersSearchT)
  ;(window as unknown as { __mbSuppliersSearchT?: number }).__mbSuppliersSearchT = window.setTimeout(() => {
    load()
  }, 250)
})
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="row">
        <div>
          <div class="title">Suppliers</div>
          <div class="sub">Master data supplier (hasil import masterdata).</div>
        </div>
        <div class="actions">
          <input v-model="q" class="mb-input search" placeholder="Search supplier..." />
          <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Refresh" }}</button>
        </div>
      </div>

      <div class="createBox">
        <div class="createTitle">Tambah Supplier</div>
        <div class="createRow">
          <input v-model="createName" class="mb-input" placeholder="Nama supplier" />
          <input v-model="createPhone" class="mb-input" placeholder="No HP (opsional)" />
          <button class="mb-btnPrimary" :disabled="createLoading" @click="createSupplier">
            {{ createLoading ? "Menyimpan..." : "Tambah" }}
          </button>
        </div>
      </div>

      <div v-if="items.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Phone</th>
              <th style="width: 1%"></th>
              <th style="text-align: right">Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in items" :key="s.id">
              <td class="mono">
                <template v-if="editingId === s.id">
                  <input v-model="editName" class="mb-input inline" />
                </template>
                <template v-else>
                  {{ s.name }}
                </template>
              </td>
              <td>
                <template v-if="editingId === s.id">
                  <input v-model="editPhone" class="mb-input inline" placeholder="No HP" />
                </template>
                <template v-else>
                  {{ s.phone ?? "-" }}
                </template>
              </td>
              <td style="text-align: right; white-space: nowrap">
                <template v-if="editingId === s.id">
                  <button class="mb-btn" :disabled="editLoading" @click="saveEdit">
                    {{ editLoading ? "..." : "Simpan" }}
                  </button>
                  <button class="mb-btn" :disabled="editLoading" @click="cancelEdit">Batal</button>
                </template>
                <button v-else class="mb-btn" @click="startEdit(s)">Edit</button>
              </td>
              <td style="text-align: right" class="mono">
                {{ new Date(s.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty">Tidak ada data.</div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
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
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.title {
  font-weight: 900;
}
.sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.search {
  width: min(360px, 70vw);
}
.createBox {
  margin-top: 14px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 16px;
  padding: 14px;
}
.createTitle {
  font-weight: 900;
  font-size: 13px;
}
.createRow {
  margin-top: 10px;
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) minmax(160px, 1fr) auto;
  gap: 10px;
  align-items: center;
}
.inline {
  height: 34px;
  border-radius: 10px;
}
.tableWrap {
  margin-top: 12px;
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
  border-bottom: 1px solid rgba(42, 58, 94, 0.5);
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
.empty {
  margin-top: 12px;
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
</style>
