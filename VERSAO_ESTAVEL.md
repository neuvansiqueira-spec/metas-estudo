# Versão estável do Aldus Meta

## Versão estável atual

`20260718-protecao-recuperacao-tempo-v48`

## Data

18/07/2026

## Proteção e recuperação do tempo de estudo

Esta versão impede que um total de estudo já registrado seja substituído por um valor menor durante a normalização, abertura ou mesclagem das bases locais.

Na abertura, o sistema passa a comparar e mesclar com segurança:

- a cópia principal do IndexedDB;
- a cópia de compatibilidade do localStorage;
- os registros de tempo existentes no backup automático anterior à mesclagem.

Do backup histórico são recuperados apenas:

- sessões de estudo;
- metas diárias e seus totais;
- registros de questões com tempo.

Materiais, configurações, biblioteca de prompts e demais áreas não são restaurados pelo mecanismo de recuperação do tempo.

## Segurança da recuperação

Quando forem encontrados dados adicionais, a recuperação é salva primeiro neste dispositivo. O envio para a nuvem fica pendente para revisão, evitando que uma recuperação ainda não conferida substitua automaticamente o conteúdo dos outros dispositivos.

O sistema mantém um relatório técnico interno com as fontes examinadas, a quantidade de sessões e os totais encontrados antes e depois da recuperação.

## Precisão das novas sessões

As novas sessões do cronômetro continuam mantendo os minutos usados pela interface atual, mas passam a arquivar também:

- segundos efetivamente executados;
- segundos decorridos;
- duração real em segundos.

Isso evita que a precisão original seja perdida no momento do salvamento.

## Compatibilidade e preservação

A alteração não remove metas, sessões, materiais, históricos ou registros existentes. A raiz do projeto e a publicação em `docs/` usam os mesmos arquivos e a mesma versão de cache.
