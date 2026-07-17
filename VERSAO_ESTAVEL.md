# Versão estável do Metas Estudo

## Versão estável atual

`20260717-sincronizacao-conteudo-v30`

## Data

17/07/2026

## Convergência real entre dispositivos

Esta versão corrige a situação em que dois dispositivos exibiam tempos diferentes mesmo quando os metadados de sincronização apresentavam o mesmo horário.

A sincronização agora compara uma assinatura do conteúdo completo dos dados. O sistema somente informa “Tudo sincronizado” quando os registros do dispositivo e da nuvem são realmente equivalentes.

Quando o conteúdo for diferente, a mesclagem integral é executada e preserva:

- sessões de estudo e de questões;
- tempos registrados e totais acumulados;
- detalhes, observações e históricos;
- registros exclusivos existentes em cada dispositivo;
- sessões antigas sem identificador confiável.

Depois da mesclagem, os totais das metas são reconstruídos com base nas sessões preservadas. A classificação entre estudo e questões é mantida.

Antes de cada mesclagem permanece a criação de uma cópia local de segurança. Nenhum `localStorage` é limpo automaticamente.

A versão mantém as correções anteriores do Cronômetro Livre: duração herdada da meta, percentual de progresso e mensagens motivacionais visíveis por 30 segundos.
