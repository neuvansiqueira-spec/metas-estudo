# Versão estável do Metas Estudo

## Versão estável atual

`20260717-salvamento-integral-tempo-v33`

## Data

17/07/2026

## Salvamento integral do tempo

Esta versão corrige o caso em que uma sessão era salva pelo cronômetro, mas o total exibido pela meta permanecia com o valor anterior.

Depois de salvar uma sessão vinculada à meta, o sistema agora:

- preserva a sessão completa no histórico;
- reconstrói os minutos de estudo e de questões com base nas sessões salvas;
- atualiza imediatamente o total realizado da meta;
- grava novamente o estado local com marcação de alteração;
- mantém sessões configuradas para não atualizar a meta fora do cálculo automático.

Assim, uma meta com 42 minutos passa para 43 minutos ao receber uma nova sessão válida de 1 minuto.

## Atualização entre o app e o site no mesmo computador

O app instalado e a aba comum do navegador passam a escutar alterações do armazenamento da mesma origem. Quando o tempo é salvo em um deles, o outro incorpora e renderiza o estado atualizado sem depender da nuvem.

## Autorização do Google Drive

Quando o dispositivo continua marcado como conectado, mas o token expirou, o sistema tenta renovar a autorização antes de interromper a sincronização. Se a renovação silenciosa não for aceita pelo navegador, é exibida uma orientação clara para tocar em **Conectar Google Drive**. Nenhum envio ou download é possível sem autorização válida do Google.

Depois de renovar a autorização, alterações pendentes continuam preservadas e podem ser enviadas para a nuvem.

## Sincronização integral entre dispositivos

A versão mantém a mesclagem por conteúdo completo e preserva:

- sessões de estudo e de questões;
- tempos registrados e totais acumulados;
- detalhes, observações e históricos;
- registros exclusivos existentes em cada dispositivo;
- sessões antigas sem identificador confiável.

Antes de cada mesclagem permanece a criação de uma cópia local de segurança. Nenhum `localStorage` é limpo automaticamente.

## Mensagens motivacionais

A correção do Cronômetro Livre permanece ativa. As mensagens aparecem nos marcos de 10%, 25%, 40%, 50%, 65%, 75%, 90% e 100% e permanecem visíveis por 30 segundos.

## Segurança dos dados

A alteração não remove sessões, metas ou históricos. A reconstrução dos totais usa os registros já preservados e somente acrescenta sessões novas identificadas como distintas.
