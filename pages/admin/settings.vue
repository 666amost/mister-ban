<script setup lang="ts">
definePageMeta({ middleware: "admin" })

type Mode = "default" | "custom" | "hidden"
type StoreSettings = {
  id: string
  name: string
  receipt_instagram_mode: Mode
  receipt_instagram: string | null
}

const storeContext = useStoreContext()
const loading = ref(true)
const saving = ref(false)
const error = ref("")
const success = ref("")
const form = ref({ name: "", receipt_instagram_mode: "default" as Mode, receipt_instagram: "" })

function message(value: unknown) {
  if (!value || typeof value !== "object") return null
  const e = value as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

async function load() {
  loading.value = true
  error.value = ""
  try {
    const { store } = await $fetch<{ store: StoreSettings }>("/api/admin/store-settings")
    form.value = {
      name: store.name,
      receipt_instagram_mode: store.receipt_instagram_mode,
      receipt_instagram: store.receipt_instagram ?? "",
    }
  } catch (e) {
    error.value = message(e) ?? "Gagal memuat pengaturan toko"
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ""
  success.value = ""
  try {
    await $fetch("/api/admin/store-settings", { method: "PATCH", body: form.value })
    await storeContext.refresh()
    success.value = "Pengaturan toko dan tampilan struk berhasil disimpan."
  } catch (e) {
    error.value = message(e) ?? "Gagal menyimpan pengaturan"
  } finally {
    saving.value = false
  }
}

await load()
</script>

<template>
  <div class="settingsPage">
    <section class="mb-card settingsCard">
      <div>
        <h1>Pengaturan Toko</h1>
        <p class="muted">Pengaturan berlaku untuk toko yang sedang aktif dan digunakan pada struk berikutnya.</p>
      </div>

      <div v-if="loading" class="muted">Memuat...</div>
      <form v-else class="form" @submit.prevent="save">
        <label class="field">
          <span>Nama toko</span>
          <input v-model.trim="form.name" class="mb-input" maxlength="100" required />
          <small>Nama ini tampil di aplikasi dan bagian atas struk.</small>
        </label>

        <fieldset class="igOptions">
          <legend>Instagram di struk</legend>
          <label><input v-model="form.receipt_instagram_mode" type="radio" value="default" /> Default sesuai data toko</label>
          <label><input v-model="form.receipt_instagram_mode" type="radio" value="custom" /> Gunakan akun lain</label>
          <label><input v-model="form.receipt_instagram_mode" type="radio" value="hidden" /> Sembunyikan dari struk</label>
        </fieldset>

        <label v-if="form.receipt_instagram_mode === 'custom'" class="field">
          <span>Akun Instagram</span>
          <input v-model.trim="form.receipt_instagram" class="mb-input" maxlength="100" placeholder="@namaakun" required />
        </label>

        <p v-if="error" class="notice error">{{ error }}</p>
        <p v-if="success" class="notice success">{{ success }}</p>
        <button class="mb-btnPrimary saveButton" type="submit" :disabled="saving || !form.name.trim()">
          {{ saving ? "Menyimpan..." : "Simpan Pengaturan" }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.settingsPage { max-width: 760px; margin: 0 auto; }
.settingsCard { display: grid; gap: 24px; }
h1 { margin: 0 0 6px; font-size: 1.35rem; }
.muted, small { color: var(--mb-muted, #94a3b8); }
.form, .field { display: grid; gap: 9px; }
.form { gap: 22px; }
.field > span, legend { font-weight: 700; }
.igOptions { display: grid; gap: 12px; margin: 0; padding: 16px; border: 1px solid var(--mb-border, #334155); border-radius: 12px; }
.igOptions label { display: flex; align-items: center; gap: 9px; cursor: pointer; }
.notice { margin: 0; padding: 11px 13px; border-radius: 10px; }
.error { color: #fca5a5; background: rgb(127 29 29 / 25%); }
.success { color: #86efac; background: rgb(20 83 45 / 28%); }
.saveButton { justify-self: start; }
</style>
