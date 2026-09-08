const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,'tools',file),'utf8');
const apply = read('plano-do-dia-v610-aplicar.js'), undo = read('plano-do-dia-v610-desfazer.js');
const clone = x => JSON.parse(JSON.stringify(x));
const make = (id, extra={}) => ({id,date:'2026-09-08',minutes:30,status:'Pendente',userEdited:true,...extra});
function fixture() {
  return [make('past',{date:'2026-09-07',dataOriginalV605:true}),make('piece',{fixedDailyPieceV183:true}),make('other'),
    ...Array.from({length:36},(_,i)=>make(`delta-${i}`,{date:`2026-09-${16+Math.floor(i/2)%15}`,dataOriginalV605:'2026-09-01',minutes:60})),
    ...Array.from({length:17},(_,i)=>make(`sim-${i}`,{date:`2026-09-${String(8+i%8).padStart(2,'0')}`,simulado3V605:true,minutes:i<5?120:30}))];
}
function runtime(goals=fixture(), { failSave=false, conflict=false, failVerify=false }={}) {
  const state={dailyGoals:goals,backupMetasV606:{old:true},backupMetasV607:[1],backupMetasV608:[2],planning:{config:{topicsPerDay:4}}};
  let stored={data:clone(state),checksum:'base'}, reads=0,saves=0;
  const c={__state:state,console:{info(){},table(){}},
    validateIndexedDBState:r=>!!r?.data,
    async loadStateFromIndexedDB(){reads++;return failVerify&&reads>1?{...stored,checksum:'diverged'}:clone(stored);},
    async saveStateToIndexedDB(s,opts){saves++; assert.equal(opts.expectedChecksum,stored.checksum); assert.equal(opts.directSnapshot,true); if(failSave||conflict)throw new Error('write conflict'); stored={data:clone(s),checksum:'saved-'+saves}; return clone(stored);}
  };
  vm.createContext(c);
  vm.runInContext('const state=__state; let indexedDBPersistInFlight=false; let indexedDBPersistQueued=false; let indexedDBPersistBaseChecksum="base"; const bootstrapStateReady=true;',c);
  return {state,c,stored:()=>stored,saves:()=>saves,run:()=>vm.runInContext(apply,c),undo:()=>vm.runInContext(undo,c)};
}
test('console: 36 Delta saem, 17 cotas viram 2/dia até 16/09; longas pareadas com curtas',async()=>{
  const h=runtime(),before=clone(h.state); const result=await h.run();
  assert.equal(result.removed,36); assert.equal(h.state.dailyGoals.filter(g=>g.simulado3V605).length,17);
  const quotas=h.state.dailyGoals.filter(g=>g.simulado3V605);
  for(let i=8;i<=16;i++) {
    const daily=quotas.filter(g=>g.date===`2026-09-${String(i).padStart(2,'0')}`);
    assert.equal(daily.length,i===16?1:2);assert.ok(daily.filter(g=>g.minutes===120).length<=1);
  }
  assert.deepEqual(h.stored().data,clone(h.state));
  assert.equal(h.state.backupMetasV610.removed.length,36);
  assert.deepEqual(h.state.backupMetasV606,before.backupMetasV606);
  assert.deepEqual(h.state.backupMetasV607,before.backupMetasV607);
  assert.deepEqual(h.state.backupMetasV608,before.backupMetasV608);
  for(const id of ['past','piece','other']) assert.deepEqual(h.state.dailyGoals.find(g=>g.id===id),before.dailyGoals.find(g=>g.id===id));
  assert.ok(result.rows.some(r=>r.metasAntes!==r.metasDepois));
});
test('console: desfazer restaura estado das metas exatamente e preserva backup',async()=>{
 const h=runtime(), before=clone(h.state.dailyGoals); await h.run(); await h.undo();
 assert.deepEqual(clone(h.state.dailyGoals),before);assert.equal(h.state.backupMetasV610.status,'undone');
 await assert.rejects(h.undo(),/Não existe aplicação/);
});
test('console: tempo em qualquer campo e concluídas são preservados',async()=>{
 const g=fixture();Object.assign(g.find(x=>x.id==='delta-1'),{actualMinutes:2});Object.assign(g.find(x=>x.id==='delta-2'),{tempoReal:7});
 Object.assign(g.find(x=>x.id==='sim-0'),{actualMinutes:3});Object.assign(g.find(x=>x.id==='sim-1'),{tempoReal:4});Object.assign(g.find(x=>x.id==='sim-2'),{status:'Concluída'});
 const old=clone(g),h=runtime(g);await h.run();
 for(const id of ['delta-1','delta-2','sim-0','sim-1','sim-2'])assert.deepEqual(h.state.dailyGoals.find(x=>x.id===id),old.find(x=>x.id===id));
 assert.equal(h.state.backupMetasV610.removed.length,34);
});
test('console: repetir aplicação não altera nem sobrescreve backup',async()=>{
 const h=runtime();await h.run();const before=clone(h.state);await assert.rejects(h.run(),/já existe/);assert.deepEqual(clone(h.state),before);
});
test('console: falha de escrita restaura memória e não deixa backup fictício',async()=>{
 const h=runtime(fixture(),{failSave:true}),before=clone(h.state);await assert.rejects(h.run(),/write conflict/);assert.deepEqual(h.state,before);
 assert.equal(vm.runInContext('indexedDBPersistInFlight',h.c),false);
});
test('console: nova meta posterior sobrevive ao desfazer',async()=>{
 const h=runtime();await h.run();const g=make('new-manual');h.state.dailyGoals.push(g);await h.undo();assert.ok(h.state.dailyGoals.includes(g));
});
test('console: desfazer não sobrescreve cota editada ou com tempo lançado',async()=>{
 const h=runtime();await h.run();const id=h.state.backupMetasV610.moved[0].after.id;h.state.dailyGoals.find(g=>g.id===id).tempoReal=3;
 const before=clone(h.state);await assert.rejects(h.undo(),/mudou após/);assert.deepEqual(clone(h.state),before);
});
test('console: identificadores duplicados abortam antes de alterar dados',async()=>{
 const g=fixture();g.push(clone(g[4]));const h=runtime(g),before=clone(h.state);await assert.rejects(h.run(),/identificador único/);assert.deepEqual(h.state,before);assert.equal(h.saves(),0);
});
test('console: dados antigos e peça não são alvos nem com carimbos',async()=>{
 const g=[make('oldsim',{date:'2026-09-07',simulado3V605:true}),make('fixed',{fixedDailyPieceV183:true,dataOriginalV605:true})];
 const h=runtime(g);await h.run();assert.deepEqual(h.state.dailyGoals,g);
});
test('console: quantidade real diferente é relatada sem inventar metas',async()=>{
 const h=runtime([make('sim',{simulado3V605:true})]);await h.run();assert.equal(h.state.dailyGoals.length,1);assert.equal(h.state.backupMetasV610.observed.simulado,1);
});
test('console: falha após commit conserva backup para recuperação',async()=>{
 const h=runtime(fixture(),{failVerify:true});await assert.rejects(h.run(),/gravação ocorreu/);assert.equal(h.state.backupMetasV610.status,'applied');assert.equal(h.stored().data.backupMetasV610.status,'applied');
});
test('console: aplicar e desfazer são autossuficientes e diferem só no modo',()=>{
 assert.equal(apply.replace('const mode = "apply"','const mode = "undo"'),undo);
});
