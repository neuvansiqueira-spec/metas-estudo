# Versão estável do Metas Estudo

## Versão estável atual

`20260717-sincronizacao-integral-cronometro-v29`

## Data

17/07/2026

## Sincronização integral entre dispositivos

Esta versão preserva a organização e os dados anteriores e corrige a sincronização do cronômetro entre dispositivos.

Ao enviar ou baixar os dados do Google Drive, o sistema passa a mesclar os registros existentes nos dois dispositivos, em vez de substituir integralmente um estado pelo outro.

A mesclagem preserva:

- todos os tempos registrados;
- os totais acumulados das metas;
- todas as sessões de estudo;
- os detalhes e históricos de cada sessão;
- sessões de questões e registros relacionados;
- dados exclusivos existentes em cada dispositivo.

Sessões diferentes são mantidas. A mesma sessão é deduplicada pelo identificador estável e conserva a versão mais completa. Depois da mesclagem, os totais das metas são reconstruídos a partir do conjunto completo de sessões.

Antes de cada mesclagem é criada uma cópia local de segurança. A sincronização não limpa o `localStorage`, não apaga registros e não substitui deliberadamente os dados de um dispositivo pelos dados do outro.

A versão também mantém as correções anteriores do Cronômetro Livre: duração herdada da meta, percentual de progresso e mensagens motivacionais visíveis por 30 segundos.

## Regras de estabilidade

1. Não apagar dados do usuário nem limpar `localStorage` automaticamente.
2. Preservar registros de ambos os dispositivos durante a sincronização.
3. Deduplicar somente registros identificados como a mesma sessão.
4. Recalcular os totais com base nas sessões preservadas.
5. Criar cópia de segurança antes de aplicar uma mesclagem da nuvem.
6. Manter raiz e pasta `docs/` sincronizadas.
