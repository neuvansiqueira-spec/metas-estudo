# Versão estável do Metas Estudo

## Versão estável atual

`20260717-espectro-continuo-acertos-v34`

## Data

17/07/2026

## Espectro contínuo no Total Calculado

Na aba **Registrar sessão de questões**, o quadro **Total calculado** passa a refletir visualmente o percentual de acertos com uma transição contínua.

O componente apresenta:

- espectro suave vermelho → laranja → amarelo → verde → azul;
- marcador posicionado na porcentagem exata de acertos;
- tonalidade de fundo e borda calculada continuamente, sem faixas rígidas;
- atualização imediata ao alterar total, acertos, erros ou brancos;
- comportamento responsivo no computador, aplicativo instalado e celular;
- atributos de acessibilidade com valor percentual do indicador.

A escala visual não altera o cálculo já utilizado pelo sistema. O percentual continua sendo calculado a partir dos valores informados na sessão.

## Salvamento integral do tempo

A versão mantém a correção em que uma sessão salva pelo cronômetro atualiza imediatamente o total da meta, preserva o histórico completo e reconstrói os minutos de estudo e de questões com base nas sessões registradas.

## Atualização entre o app e o site no mesmo computador

O app instalado e a aba comum do navegador continuam escutando alterações do armazenamento da mesma origem. Quando o tempo é salvo em um deles, o outro incorpora e renderiza o estado atualizado sem depender da nuvem.

## Autorização do Google Drive

Quando o dispositivo continua marcado como conectado, mas o token expirou, o sistema tenta renovar a autorização antes de interromper a sincronização. Se a renovação silenciosa não for aceita pelo navegador, é exibida orientação para tocar em **Conectar Google Drive**.

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

A alteração visual do percentual não modifica sessões, metas, históricos, totais nem dados de sincronização.
