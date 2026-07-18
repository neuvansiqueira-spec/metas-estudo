# Versão estável do Aldus Meta

## Versão estável atual

`20260718-diagnostico-recuperacao-tempo-v49`

## Data

18/07/2026

## Diagnóstico ampliado e recuperação controlada do tempo

Esta versão mantém as proteções da v48 e acrescenta uma ferramenta visível na aba **Backup → Recuperação de Tempos Antigos**.

O diagnóstico examina:

- o estado atualmente carregado;
- o IndexedDB;
- o localStorage principal;
- o backup automático anterior à mesclagem;
- outras chaves locais que ainda contenham sessões, metas ou registros de tempo.

## Marcadores de exclusão

A v48 respeitava os marcadores de exclusão da sincronização. Isso podia fazer com que uma sessão existente no backup fosse novamente descartada durante a tentativa de recuperação.

A v49 mostra quantos marcadores ligados ao tempo foram encontrados e oferece a ação **Recuperar maior tempo encontrado**.

A recuperação manual:

- ignora somente os marcadores correspondentes aos registros de tempo efetivamente recuperados;
- mantém os demais marcadores de exclusão;
- preserva materiais, configurações, biblioteca de prompts e outras áreas;
- cria uma cópia integral antes de qualquer alteração;
- mantém o envio para a nuvem pendente até conferência do usuário.

## Precisão das novas sessões

As novas sessões continuam arquivando minutos e também preservam os segundos efetivamente executados, os segundos decorridos e a duração real em segundos.

## Compatibilidade

A raiz do projeto e a publicação em `docs/` usam arquivos idênticos e o cache `startup-v22`.
