"use strict";

// service-worker-v344.js — lápide de recuperação. NÃO APAGAR esta URL.
const CACHE_PREFIX = "metas-estudo-";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(desativarRegistro()); });
async function desativarRegistro() {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name).catch(() => false)));
  await self.clients.claim();
  await self.registration.unregister();
  const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(abas.map((aba) => typeof aba.navigate === "function" ? aba.navigate(aba.url).catch(() => null) : null));
}
