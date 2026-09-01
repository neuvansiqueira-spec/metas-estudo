"use strict";

// Ponte de compatibilidade para instalações que ainda registram a URL V378.
// Mantém a URL publicada, não toca no IndexedDB e executa o worker canônico atual.
importScripts("service-worker.js?v=20260901-bootstrap-current-bundle-v421");
