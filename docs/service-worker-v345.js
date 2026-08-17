"use strict";

// service-worker-v345.js — lápide de autodestruição da V345.
//
// A V345 foi retirada do site ativo pela recuperação emergencial que restaurou a
// V344, e o arquivo original deste service worker foi apagado junto. Só que o
// registro feito pelos navegadores que visitaram o site durante a V345 continuou
// apontando para esta URL: `registerServiceWorker` monta o nome a partir do
// sufixo da release (`service-worker-${suffix}.js`) e registra com
// `updateViaCache: "none"`.
//
// Esse `updateViaCache: "none"` faz o navegador revalidar este script na rede a
// cada navegação. Enquanto a URL respondia 404, a atualização abortava e o
// service worker V345 permanecia ativo — servindo o shell V345 do cache, porque
// a estratégia dele para navegação era cache-first. O shell servido registrava
// de novo esta mesma URL inexistente, fechando o ciclo. Nenhuma publicação
// posterior alcançava esses navegadores.
//
// Este arquivo quebra o ciclo por existir. Ao voltar a responder 200 com bytes
// diferentes, a revalidação passa a ter sucesso, esta versão instala e então se
// remove. Ele deliberadamente NÃO registra um handler de `fetch`: sem
// interceptação, a navegação volta para a rede, que entrega o `index.html` da
// V344 e registra o `service-worker-v344.js`, restabelecendo o caminho normal.
//
// NÃO APAGAR. Um `service-worker-vNNN.js` já publicado nunca pode voltar a
// responder 404 — foi exatamente essa deleção que criou a falha. Substitua por
// uma lápide como esta, jamais remova a URL.

const CACHE_PREFIX = "metas-estudo-";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(desativarRegistro());
});

async function desativarRegistro() {
  await limparCachesDoAplicativo();

  // `claim` assume o controle das abas que ainda respondiam ao service worker
  // V345 anterior; sem isso elas seguiriam com o controlador antigo até serem
  // fechadas, e `navigate` abaixo não teria efeito.
  await self.clients.claim();
  await self.registration.unregister();
  await recarregarAbasAbertas();
}

async function limparCachesDoAplicativo() {
  // Apaga somente o Cache Storage do aplicativo, seguindo o mesmo prefixo que a
  // limpeza de versões do service worker ativo já usa.
  //
  // Os dados do usuário não estão aqui: estudos, metas e registros de tempo
  // ficam no IndexedDB (`metas-estudo-db` e `metas-estudo-safety-v258`). Este
  // arquivo nunca toca nesse armazenamento. O único efeito colateral é o app
  // ficar sem modo offline até o próximo carregamento online, que reconstrói o
  // cache da V344.
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(CACHE_PREFIX))
      .map((name) => caches.delete(name).catch(() => false))
  );
}

async function recarregarAbasAbertas() {
  const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(
    abas.map((aba) => {
      if (typeof aba.navigate !== "function") return null;
      return aba.navigate(aba.url).catch(() => null);
    })
  );
}
