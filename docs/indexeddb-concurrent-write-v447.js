(() => {
  "use strict";

  // V447 — Gravação concorrente entre abas não é falha do IndexedDB.
  //
  // Com duas abas do site abertas, o console repetia:
  //
  //   [Metas Estudo] IndexedDB indisponível; usando localStorage fallback.
  //   Error: A validação da gravação no IndexedDB falhou.
  //
  // O ciclo em processIndexedDBStateCopyQueue grava, relê e compara a soma de
  // verificação. Entre a gravação e a releitura, a outra aba grava por cima; a
  // releitura devolve o registro dela, a soma não bate, e o app conclui que o
  // IndexedDB falhou. A partir daí `indexedDBStatus.available` fica falso e a
  // persistência cai para o localStorage — que, com 12 MB de estado, está
  // cheio. Resultado: nada mais é gravado em lugar nenhum.
  //
  // Diagnóstico medido em 04/09/2026, antes desta correção:
  //   registro_valido: true, checksum_bate_com_o_conteudo: true
  // O registro estava íntegro e consistente consigo mesmo. Nunca houve falha do
  // IndexedDB — havia outro escritor.
  //
  // A correção intercepta apenas esta assinatura de erro e, antes de rebaixar a
  // persistência, relê o registro:
  //
  //   registro válido  -> foi outra aba. Mantém o IndexedDB ativo e reenfileira
  //                       a gravação; o caminho de mesclagem já existente
  //                       (expectedChecksum + mergeSyncStates) reconcilia as
  //                       duas versões na passada seguinte.
  //   registro inválido -> falha real. Rebaixa como antes.
  //
  // Por isso a mudança é segura sob qualquer das duas hipóteses: quando o
  // registro está de fato corrompido, o comportamento antigo permanece.
  //
  // `indexedDBPersistBaseChecksum` NÃO é atualizado de propósito. Apontá-lo
  // para o registro da outra aba faria a próxima gravação considerar-se em dia
  // e sobrescrever o trabalho dela sem mesclar. Mantendo a base anterior, a
  // divergência é detectada e as duas versões se juntam.
  //
  // Correção por módulo, e não em script.js: aquele arquivo entra no bundle
  // publicado e está congelado pelo gate de escopo. As variáveis da fila são
  // declaradas com `let` no topo do bundle, portanto alcançáveis por
  // identificador simples a partir daqui.

  const VERSION = "20260904-indexeddb-concurrent-write-v447";
  const API_KEY = "__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__";
  const WARNING_MESSAGE = "Falha ao atualizar a cópia IndexedDB.";
  const VALIDATION_ERROR = "A validação da gravação no IndexedDB falhou.";
  const LOCAL_STORAGE_FULL_MESSAGE = "IndexedDB funcionando; cópia localStorage indisponível por falta de espaço.";

  // Duas abas gravando em revezamento poderiam se reenfileirar sem fim. Depois
  // deste número de recuperações seguidas o módulo para de reenfileirar — sem
  // rebaixar a persistência: o próximo salvamento comum grava de qualquer modo.
  const MAX_CONSECUTIVE_REQUEUES = 5;

  let consecutiveRecoveries = 0;

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const text = (value) => String(value ?? "");

  // Só a assinatura exata do ciclo gravar-reler-comparar. Qualquer outro aviso
  // do IndexedDB segue direto para o comportamento original.
  function isConcurrentWriteSignature(message, error) {
    if (text(message) !== WARNING_MESSAGE) return false;
    return text(error?.message || error) === VALIDATION_ERROR;
  }

  function resolveStatus() {
    try {
      // eslint-disable-next-line no-undef
      if (isObject(indexedDBStatus)) return indexedDBStatus;
    } catch { /* fora do app */ }
    return isObject(globalThis.indexedDBStatus) ? globalThis.indexedDBStatus : null;
  }

  // Repõe o estado que recordIndexedDBWarning teria derrubado.
  function markHealthy(status, record) {
    status.available = true;
    status.activeSource = "IndexedDB";
    status.validation = "válido";
    if (record?.savedAt) status.lastCopyAt = record.savedAt;
    status.error = status.localStorageFull ? LOCAL_STORAGE_FULL_MESSAGE : "";
  }

  async function verifyBeforeDemoting(original, message, error) {
    const status = resolveStatus();
    try {
      // eslint-disable-next-line no-undef
      const record = await loadStateFromIndexedDB();
      // eslint-disable-next-line no-undef
      const valid = typeof validateIndexedDBState === "function" && validateIndexedDBState(record);
      if (!valid || !status) {
        consecutiveRecoveries = 0;
        original(message, error);
        return false;
      }
      markHealthy(status, record);
      consecutiveRecoveries += 1;
      if (typeof globalThis.updateStorageDiagnostics === "function") globalThis.updateStorageDiagnostics();
      if (consecutiveRecoveries <= MAX_CONSECUTIVE_REQUEUES && typeof globalThis.queueIndexedDBStateCopy === "function") {
        globalThis.queueIndexedDBStateCopy();
      } else if (consecutiveRecoveries > MAX_CONSECUTIVE_REQUEUES) {
        console.warn("[Aldus V447] Gravações concorrentes seguidas; aguardando o próximo salvamento comum. Verifique se há outra aba do site aberta.");
      }
      return true;
    } catch (verificationError) {
      // Não conseguir reler é falha de verdade: mantém o comportamento antigo.
      consecutiveRecoveries = 0;
      original(message, verificationError || error);
      return false;
    }
  }

  function install() {
    try {
      const original = globalThis.recordIndexedDBWarning;
      if (typeof original !== "function") return false;
      if (original.__aldusConcurrentWriteV447 === VERSION) return true;
      const wrapped = function(message, error) {
        if (!isConcurrentWriteSignature(message, error)) {
          consecutiveRecoveries = 0;
          return original.call(this, message, error);
        }
        // A verificação é assíncrona; a decisão de rebaixar fica com ela.
        verifyBeforeDemoting(original.bind(this), message, error);
        return undefined;
      };
      Object.defineProperty(wrapped, "__aldusConcurrentWriteV447", { value: VERSION });
      Object.defineProperty(wrapped, "__aldusConcurrentWriteOriginal", { value: original });
      globalThis.recordIndexedDBWarning = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  const RETRY_MS = 60;
  const TIMEOUT_MS = 20000;

  function start() {
    const inicio = Date.now();
    const tentar = () => {
      if (install()) return;
      if (Date.now() - inicio >= TIMEOUT_MS) {
        console.warn("[Aldus V447] recordIndexedDBWarning não apareceu a tempo; a proteção contra gravação concorrente não foi instalada.");
        return;
      }
      setTimeout(tentar, RETRY_MS);
    };
    tentar();
  }

  const api = Object.freeze({
    version: VERSION,
    warningMessage: WARNING_MESSAGE,
    validationError: VALIDATION_ERROR,
    maxConsecutiveRequeues: MAX_CONSECUTIVE_REQUEUES,
    isConcurrentWriteSignature,
    verifyBeforeDemoting,
    install,
    resetCounter() { consecutiveRecoveries = 0; }
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", start, { once: true });
    window.addEventListener("aldus:bootstrap-ready", start, { once: true });
    window.addEventListener("load", start, { once: true });
  }
})();
