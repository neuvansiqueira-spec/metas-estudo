# Versão estável do Metas Estudo

## Versão estável atual

`20260717-login-google-somente-manual-v36`

## Data

17/07/2026

## Login do Google somente por ação do usuário

Esta versão corrige a abertura repetida da janela **Escolha uma conta** ao abrir, atualizar, focar ou retornar ao site.

As verificações automáticas da nuvem agora:

- identificam quando a autorização do Google Drive expirou;
- exibem a orientação no painel de Backup;
- preservam alterações pendentes no dispositivo;
- não abrem janela, popup ou seletor de conta.

A autenticação interativa somente pode ser iniciada quando o usuário:

- toca em **Conectar Google Drive**;
- executa uma sincronização manual que exige renovação da autorização.

Salvar dados com a autorização expirada mantém a alteração local e marca o envio como pendente, sem interromper o trabalho com uma janela de login.

## Espectro contínuo no Total Calculado

Na aba **Registrar sessão de questões**, o quadro **Total calculado** reflete visualmente o percentual de acertos com uma transição contínua vermelho → laranja → amarelo → verde → azul, marcador na porcentagem exata e atualização imediata.

## Salvamento integral do tempo

Uma sessão salva pelo cronômetro atualiza imediatamente o total da meta, preserva o histórico completo e reconstrói os minutos de estudo e de questões com base nas sessões registradas.

## Atualização entre o app e o site no mesmo computador

O app instalado e a aba comum do navegador continuam escutando alterações do armazenamento da mesma origem. Quando o tempo é salvo em um deles, o outro incorpora e renderiza o estado atualizado sem depender da nuvem.

## Sincronização integral entre dispositivos

A mesclagem por conteúdo completo preserva:

- sessões de estudo e de questões;
- tempos registrados e totais acumulados;
- detalhes, observações e históricos;
- registros exclusivos existentes em cada dispositivo;
- sessões antigas sem identificador confiável.

Antes de cada mesclagem permanece a criação de uma cópia local de segurança. Nenhum `localStorage` é limpo automaticamente.

## Mensagens motivacionais

A correção do Cronômetro Livre permanece ativa. As mensagens aparecem nos marcos de 10%, 25%, 40%, 50%, 65%, 75%, 90% e 100% e permanecem visíveis por 30 segundos.

## Segurança dos dados

A correção do login atua apenas no fluxo de autorização. Não remove nem altera sessões, metas, históricos, totais ou dados locais.
