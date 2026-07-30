(() => {
  "use strict";

  const VERSION = "20260730-reprocessamento-corretivo-captura-v188";
  const BANK_VERSION = "20260730-cadastro-segmentado-captura-v188";

  if (globalThis.__ALDUS_QC_CAPTURE_REPROCESS_V188__) return;

  function safeSnapshot(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return null; }
  }

  function installReaderCompatibility() {
    const importer = globalThis.AldusQconcursosCaptureImport;
    if (!importer?.readFile || importer.__aldusReprocessV188) return false;
    const originalReadFile = importer.readFile.bind(importer);
    const wrapped = {
      ...importer,
      __aldusReprocessV188: true,
      async readFile(file, options = {}) {
        const currentVersionFingerprints = new Set(
          (state.questionBankSessions || [])
            .filter((session) => session.captureImporterVersion === BANK_VERSION)
            .map((session) => session.sourceFingerprint)
            .filter(Boolean)
        );
        return originalReadFile(file, {
          ...options,
          existingFingerprints: currentVersionFingerprints
        });
      }
    };
    globalThis.AldusQconcursosCaptureImport = Object.freeze(wrapped);
    return true;
  }

  function installConfirmCompatibility() {
    if (typeof qbConfirmCaptureImport !== "function" || qbConfirmCaptureImport.__aldusReprocessV188) return false;
    const originalConfirm = qbConfirmCaptureImport;

    const compatibleConfirm = function compatibleCaptureConfirmV188() {
      const fingerprint = qbCaptureImportDraft?.fingerprint || "";
      const sessions = state.questionBankSessions || [];
      const priorSession = fingerprint
        ? sessions.find((session) => session.sourceFingerprint === fingerprint && session.captureImporterVersion !== BANK_VERSION)
        : null;
      if (!priorSession) return originalConfirm.apply(this, arguments);

      const previousSnapshot = {
        preservedAt: new Date().toISOString(),
        previousOrigin: priorSession.origin || "",
        previousCaptureImporterVersion: priorSession.captureImporterVersion || "anterior à V188",
        previousSummary: safeSnapshot(priorSession.summary),
        previousItems: safeSnapshot(priorSession.items)
      };
      const originalFingerprint = priorSession.sourceFingerprint;
      priorSession.sourceFingerprint = `${originalFingerprint}:em-correcao-v188`;

      let result;
      try {
        result = originalConfirm.apply(this, arguments);
      } finally {
        priorSession.sourceFingerprint = originalFingerprint;
      }

      const generatedSession = (state.questionBankSessions || []).find((session) => (
        session !== priorSession
        && session.sourceFingerprint === originalFingerprint
        && session.captureImporterVersion === BANK_VERSION
      ));
      if (!generatedSession) {
        if (typeof saveData === "function") saveData({ reason: "restore-capture-fingerprint-v188" });
        return result;
      }

      const originalId = priorSession.id;
      const originalCreatedAt = priorSession.createdAt;
      const history = Array.isArray(priorSession.reprocessHistory)
        ? priorSession.reprocessHistory.slice(-2)
        : [];
      history.push(previousSnapshot);
      Object.assign(priorSession, generatedSession, {
        id: originalId,
        createdAt: originalCreatedAt,
        sourceFingerprint: originalFingerprint,
        captureReprocessedAt: new Date().toISOString(),
        reprocessHistory: history
      });
      state.questionBankSessions = (state.questionBankSessions || []).filter((session) => session !== generatedSession);

      if (typeof saveData === "function") saveData({ reason: "capture-reprocessed-v188" });
      if (typeof renderQuestionBank === "function") renderQuestionBank();
      if (typeof qbRenderResult === "function") qbRenderResult(priorSession);
      const message = "A captura anterior foi relida por cartões e a sessão existente foi corrigida sem duplicar o desempenho.";
      if (typeof qbResetCaptureImport === "function") qbResetCaptureImport(message);
      if (typeof elements !== "undefined" && elements?.qbMessage) elements.qbMessage.textContent = message;
      return result;
    };

    Object.defineProperty(compatibleConfirm, "__aldusReprocessV188", { value: true });
    qbConfirmCaptureImport = compatibleConfirm;
    return true;
  }

  const readerInstalled = installReaderCompatibility();
  const confirmInstalled = installConfirmCompatibility();
  globalThis.__ALDUS_QC_CAPTURE_REPROCESS_V188__ = Object.freeze({
    version: VERSION,
    bankVersion: BANK_VERSION,
    readerInstalled,
    confirmInstalled
  });
})();
