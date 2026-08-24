# V377 — Sync signature performance

Escopo estrito:
- acelerar `syncRecordSignature` sem alterar a semântica de revisão;
- remover clones redundantes antes de `migrateLocalStorageStateToIndexedDB`;
- gerar `app-v377.js` e `service-worker-v377.js`;
- manter cronômetro, Fábrica, renderização e regras de dados sem alterações funcionais.
