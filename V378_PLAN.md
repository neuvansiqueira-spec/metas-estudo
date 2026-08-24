# V378 — IndexedDB direct snapshot performance

Escopo estrito:
- remover a clonagem profunda redundante da fila de persistência IndexedDB;
- preservar checksum, validação e proteção contra sobrescrever estado válido por estado vazio;
- usar modo direto somente no caminho assíncrono de cópia do estado;
- não alterar cronômetro, Fábrica, regras de planejamento, sincronização em nuvem ou interface;
- publicar somente com segurança e regressões verdes.
