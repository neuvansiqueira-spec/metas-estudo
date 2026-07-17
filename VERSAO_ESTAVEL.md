# Versão estável do Metas Estudo

## Versão estável atual

`20260717-mensagens-cronometro-livre-pwa-v31`

## Data

17/07/2026

## Mensagens motivacionais no aplicativo instalado

Esta versão corrige a falha observada no aplicativo instalado para Windows, em que o Cronômetro Livre avançava normalmente, mas não apresentava as mensagens motivacionais ao alcançar os marcos de progresso.

O sistema passa a usar duas verificações complementares:

- a verificação normal integrada ao cronômetro;
- um verificador independente para o PWA, executado a cada segundo.

No Cronômetro Livre com duração definida, o verificador usa a duração da sessão ou, como recuperação, a duração planejada da própria meta. As mensagens aparecem nos marcos de 10%, 25%, 40%, 50%, 65%, 75%, 90% e 100% e permanecem visíveis por 30 segundos.

A mensagem recebe prioridade visual elevada no aplicativo instalado, evitando que fique escondida atrás do cronômetro, do menu ou de outra camada da interface.

## Convergência real entre dispositivos

A versão mantém a sincronização integral por conteúdo. O sistema somente informa “Tudo sincronizado” quando os registros do dispositivo e da nuvem são realmente equivalentes.

Quando o conteúdo for diferente, a mesclagem preserva:

- sessões de estudo e de questões;
- tempos registrados e totais acumulados;
- detalhes, observações e históricos;
- registros exclusivos existentes em cada dispositivo;
- sessões antigas sem identificador confiável.

Depois da mesclagem, os totais das metas são reconstruídos com base nas sessões preservadas. Antes de cada mesclagem permanece a criação de uma cópia local de segurança. Nenhum `localStorage` é limpo automaticamente.

## Segurança dos dados

A correção das mensagens atua apenas durante a execução visual do cronômetro. Não altera tempos salvos, sessões, metas, histórico ou dados de sincronização.
