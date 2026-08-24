const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const runtimePath = path.join(ROOT, 'question-bank-manual-notes-v386.js');
const docsPath = path.join(ROOT, 'docs', 'question-bank-manual-notes-v386.js');
const loaderPath = path.join(ROOT, 'security-observability-v318.js');
const docsLoaderPath = path.join(ROOT, 'docs', 'security-observability-v318.js');

const runtime = fs.readFileSync(runtimePath, 'utf8');
const docsRuntime = fs.readFileSync(docsPath, 'utf8');
const loader = fs.readFileSync(loaderPath, 'utf8');
const docsLoader = fs.readFileSync(docsLoaderPath, 'utf8');

assert(runtime.includes('20260824-question-bank-manual-notes-v386'));
assert(runtime.includes('const NOTES_FIELD = "anotacoesManuais"'));
assert(runtime.includes('💬 Comentário'));
assert(runtime.includes('💡 Bizu'));
assert(runtime.includes('⚖️ Jurisprudência'));
assert(runtime.includes('Gerenciar anotações'));
assert(runtime.includes('Anotar questão atual'));
assert(runtime.includes('MAX_RESULTS = 20'));
assert(runtime.includes('saveData({ markLocalChange: true })'));
assert(runtime.includes('autoSyncAfterSave("question-bank-manual-notes")'));
assert(!runtime.includes('MutationObserver'));
assert(!runtime.includes('setInterval('));
assert(!runtime.includes('requestAnimationFrame('));
assert(!runtime.includes('getComputedStyle('));
assert(!runtime.includes('indexedDB'));
assert(!runtime.includes('localStorage'));
assert.strictEqual(runtime, docsRuntime, 'runtime raiz/docs deve permanecer idêntico');

const state = {
  questionBank: [
    {
      id: 'q-1',
      numero_qconcursos: '12345',
      disciplina: 'Direito Penal',
      assunto: 'Teoria da Pena',
      banca: 'FGV',
      ano: 2026,
      enunciado: 'Questão sobre teoria da pena.'
    },
    {
      id: 'q-2',
      referencia: 'QC999',
      disciplina: 'Direito Constitucional',
      assunto: 'Competência',
      banca: 'Cebraspe',
      ano: 2025,
      enunciado: 'Questão sobre competência legislativa.'
    }
  ]
};
let saveCalls = 0;
let syncCalls = 0;
const context = {
  globalThis: {},
  state,
  saveData: (options) => {
    saveCalls += 1;
    assert.strictEqual(options.markLocalChange, true);
  },
  autoSyncAfterSave: (reason) => {
    syncCalls += 1;
    assert.strictEqual(reason, 'question-bank-manual-notes');
  },
  console,
  Date,
  String,
  Array,
  Object,
  Number,
  Boolean,
  Math
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(runtime, context);

const api = context.AldusQuestionBankManualNotesV386;
assert(api, 'API V386 deve ser exposta');
assert.strictEqual(api.notesField, 'anotacoesManuais');
assert.strictEqual(api.searchQuestions('teoria da pena').length, 1);
assert.strictEqual(api.searchQuestions('QC999').length, 1);

const saved = api.persistQuestionNotes(state.questionBank[0], {
  comentario: 'Comentário pessoal',
  bizu: 'Bizu de prova',
  jurisprudencia: 'Tese jurisprudencial'
});
assert.strictEqual(saved.saved, true);
assert.strictEqual(saveCalls, 1);
assert.strictEqual(syncCalls, 1);
const savedNotes = api.notesFor(state.questionBank[0]);
assert.strictEqual(savedNotes.comentario, 'Comentário pessoal');
assert.strictEqual(savedNotes.bizu, 'Bizu de prova');
assert.strictEqual(savedNotes.jurisprudencia, 'Tese jurisprudencial');
assert.strictEqual(api.noteCount(state.questionBank[0]), 3);
assert.strictEqual(state.questionBank[0].anotacoesManuais.source, 'manual');

const importerPath = path.join(ROOT, 'question-bank-json-import-v191.js');
const importer = fs.readFileSync(importerPath, 'utf8');
assert(importer.includes('const merged = { ...existing };'));
assert(importer.includes('storedQuestion = mergeMeaningful(existing, question);'));

const cleared = api.persistQuestionNotes(state.questionBank[0], {
  comentario: '', bizu: '', jurisprudencia: ''
});
assert.strictEqual(cleared.saved, true);
assert.strictEqual(cleared.cleared, true);
assert.strictEqual(Object.prototype.hasOwnProperty.call(state.questionBank[0], 'anotacoesManuais'), false);
assert.strictEqual(saveCalls, 2);
assert.strictEqual(syncCalls, 2);

assert(loader.includes('question-bank-manual-notes-v386.js?v=20260824-question-bank-manual-notes-v386'));
assert(loader.includes('installQuestionBankManualNotesV386();'));
assert.strictEqual(loader, docsLoader, 'loader raiz/docs deve permanecer idêntico');

console.log('V386 manual notes contract: ok');