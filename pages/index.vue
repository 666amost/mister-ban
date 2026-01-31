<script setup lang="ts">
const me = useMe();
const storeContext = useStoreContext();

const menuItems = computed(() => {
  const role = me.user.value?.role;
  const base = [
    { title: "Sales", sub: "Transaksi penjualan & struk", to: "/sales" },
    { title: "Inventory", sub: "Stok per toko", to: "/inventory" },
  ];

  if (role === "ADMIN") {
    return [
      ...base,
      { title: "Products", sub: "Master produk", to: "/products" },
      {
        title: "Supplier Invoices",
        sub: "Invoice supplier & pembayaran",
        to: "/suppliers/invoices",
      },
      { title: "Daily Report", sub: "Rekap harian", to: "/reports/daily" },
      { title: "Monthly Report", sub: "Rekap bulanan", to: "/reports/monthly" },
      { title: "Import", sub: "Generate/import masterdata XLSX", to: "/admin/import" },
    ];
  }

  return base;
});
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="cardTitle">Ringkasan</div>
      <div class="summary">
        <div class="summaryItem">
          <div class="label">Toko aktif</div>
          <div class="value">{{ storeContext.store.value?.name ?? "-" }}</div>
        </div>
        <div class="summaryItem">
          <div class="label">User</div>
          <div class="value">{{ me.user.value?.email ?? "-" }}</div>
        </div>
        <div class="summaryItem">
          <div class="label">Role</div>
          <div class="value">{{ me.user.value?.role ?? "-" }}</div>
        </div>
      </div>
    </section>

    <section class="mb-card">
      <div class="rowTitle">
        <div class="cardTitle">Menu</div>
        <div class="cardSub">Fitur utama berdasarkan toko aktif.</div>
      </div>
      <div class="grid">
        <NuxtLink v-for="l in menuItems" :key="l.to" class="tile" :to="l.to">
          <div class="tileTitle">{{ l.title }}</div>
          <div class="tileSub">{{ l.sub }}</div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.cardTitle {
  font-weight: 800;
}
.cardSub {
  font-size: 12px;
  color: var(--mb-muted);
}
.rowTitle {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.summary {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.summaryItem {
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 14px;
  padding: 14px;
}
.label {
  font-size: 12px;
  color: var(--mb-muted);
}
.value {
  margin-top: 6px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.tile {
  border-radius: 14px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  padding: 14px;
  color: var(--mb-text);
  text-decoration: none;
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease;
}
.tile:hover {
  transform: translateY(-1px);
  border-color: rgba(52, 199, 89, 0.55);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}
.tileTitle {
  font-weight: 800;
}
.tileSub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
</style>
