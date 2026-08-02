/* Aldus service worker entry: 20260802-corrige-atualizacao-versao-v217 */
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
importScripts("./runtime-entry-v217.js");