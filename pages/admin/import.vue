<script setup lang="ts">
definePageMeta({ middleware: "admin" })
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="title">Masterdata XLSX</div>
      <div class="sub">
        Generate file <span class="monoInline">masterdata/masterdata.xlsx</span>, rapihkan/edit sheet
        <span class="monoInline">Products</span> dan <span class="monoInline">Suppliers</span>, lalu import ke DB.
      </div>

      <div class="steps">
        <div class="step">
          <div class="stepTitle">1) Generate</div>
          <div class="mono">npm run masterdata:xlsx</div>
        </div>
        <div class="step">
          <div class="stepTitle">2) Edit XLSX</div>
          <div class="muted">Atur kolom harga, stok awal, dan mapping store (ALL / nama toko).</div>
        </div>
        <div class="step">
          <div class="stepTitle">3) Import</div>
          <div class="mono">npm run db:import:xlsx</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.title {
  font-weight: 900;
}
.sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.steps {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}
.step {
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 14px;
  padding: 12px 14px;
}
.stepTitle {
  font-weight: 800;
}
.mono {
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  color: rgba(29, 29, 31, 0.9);
}
.monoInline {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.muted {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
</style>
