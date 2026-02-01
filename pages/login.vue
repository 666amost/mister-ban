<script setup lang="ts">
definePageMeta({ layout: "auth" })

const email = ref("");
const password = ref("");
const errorMessage = ref<string | null>(null);
const isLoading = ref(false);

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const e = error as Record<string, unknown>;
  return typeof e.statusMessage === "string" ? e.statusMessage : null;
}

async function onSubmit() {
  errorMessage.value = null;
  isLoading.value = true;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { email: email.value, password: password.value },
    });
    const user = await useMe().refresh();
    
    if (user.role === "ADMIN") {
      await navigateTo("/select-store");
    } else {
      const storeContext = useStoreContext();
      await storeContext.refresh();
      await navigateTo("/");
    }
  } catch (error: unknown) {
    errorMessage.value = statusMessage(error) ?? "Login gagal";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <main class="mb-page page">
    <div class="mb-card card">
      <div class="head">
        <img class="logo" src="/brand/logo.png" alt="Mister Ban" />
        <div>
          <h1>Mister Ban ERP</h1>
          <div class="sub">Spesialis Ban Motor</div>
        </div>
      </div>
      <form @submit.prevent="onSubmit">
        <label>
          Email
          <input
            v-model="email"
            class="mb-input"
            type="email"
            autocomplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            v-model="password"
            class="mb-input"
            type="password"
            autocomplete="current-password"
            required
            minlength="8"
          />
        </label>
        <button class="mb-btnPrimary" type="submit" :disabled="isLoading">
          {{ isLoading ? "Loading..." : "Login" }}
        </button>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>
    </div>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
.card {
  width: min(420px, 100%);
  padding: 20px;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.logo {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  object-fit: cover;
}
h1 {
  margin: 0;
  font-size: 18px;
}
.sub {
  font-size: 12px;
  color: var(--mb-muted);
}
form {
  display: grid;
  gap: 12px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 12px;
}
.mb-input {
  width: 100%;
}
.error {
  margin: 0;
  color: var(--mb-danger);
  font-size: 12px;
}
</style>
