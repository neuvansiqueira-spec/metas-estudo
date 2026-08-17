const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const existe = (file) => fs.existsSync(path.join(ROOT, file));

// As assertivas de contenção olham só o código executável: os comentários da
// lápide precisam ser livres para explicar o incidente, inclusive nomeando o
// IndexedDB que ela justamente não pode tocar.
const codigo = (file) => read(file)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

test('a lápide da V345 devolve a navegação para a rede em vez de interceptá-la', () => {
  const source = codigo('service-worker-v345.js');

  // A causa da prisão foi a navegação cache-first do service worker V345. Sem
  // handler de fetch não há interceptação: a navegação vai à rede e entrega o
  // shell publicado da V344, que registra o service-worker-v344.js.
  assert.doesNotMatch(
    source,
    /addEventListener\(\s*["']fetch["']/,
    'a lápide não pode registrar handler de fetch, senão continua servindo o shell antigo'
  );
  assert.doesNotMatch(source, /respondWith/);
  assert.doesNotMatch(source, /caches\.match/);
});

test('a lápide da V345 se remove e recarrega as abas presas', () => {
  const source = codigo('service-worker-v345.js');

  assert.match(source, /self\.skipWaiting\(\)/);
  assert.match(source, /self\.clients\.claim\(\)/);
  assert.match(source, /self\.registration\.unregister\(\)/);
  assert.match(source, /\.navigate\(/, 'as abas abertas precisam ser recarregadas após a remoção');
});

test('a lápide da V345 nunca toca nos dados do usuário', () => {
  const source = codigo('service-worker-v345.js');

  // Estudos, metas e registros de tempo ficam no IndexedDB. A limpeza é restrita
  // ao Cache Storage do aplicativo, pelo mesmo prefixo que o service worker
  // ativo já usa para descartar versões antigas.
  assert.doesNotMatch(source, /indexedDB/i, 'a lápide não pode acessar o IndexedDB');
  assert.doesNotMatch(source, /deleteDatabase/i);
  assert.match(source, /startsWith\(CACHE_PREFIX\)/);
  assert.match(source, /const CACHE_PREFIX = "metas-estudo-"/);
});

test('a lápide da V345 é idêntica na raiz e em docs', () => {
  assert.equal(
    read('service-worker-v345.js'),
    read('docs/service-worker-v345.js'),
    'service-worker-v345.js deve ser idêntico em docs'
  );
});

test('nenhum service worker já publicado desaparece do site publicado', () => {
  // Este é o invariante que faltava. O registro usa updateViaCache: "none", então
  // o navegador revalida o script na rede a cada navegação. Se a URL responder
  // 404, a atualização aborta e o navegador fica preso na versão antiga
  // indefinidamente — foi o que aconteceu quando a V345 foi retirada e o arquivo
  // dela foi apagado junto.
  const manifesto = JSON.parse(read('published-service-workers.json'));

  assert.ok(Array.isArray(manifesto.versoes) && manifesto.versoes.length > 0);

  const ausentes = manifesto.versoes.filter((versao) => !existe(`docs/service-worker-${versao}.js`));
  assert.deepEqual(
    ausentes,
    [],
    `service workers já publicados foram removidos de docs/: ${ausentes.join(', ')}. `
      + 'Substitua por uma lápide de autodestruição em vez de apagar a URL.'
  );
});

test('a release atual publica o service worker que ela mesma registra', () => {
  const version = JSON.parse(read('package.json')).version;
  const suffix = version.match(/v\d+$/)?.[0];

  assert.ok(suffix, 'a versão pública deve terminar em vNNN.');
  assert.ok(
    existe(`docs/service-worker-${suffix}.js`),
    `a release ${version} registra service-worker-${suffix}.js, que precisa existir em docs/`
  );
  assert.ok(
    JSON.parse(read('published-service-workers.json')).versoes.includes(suffix),
    `${suffix} precisa constar no manifesto de service workers publicados`
  );
});
