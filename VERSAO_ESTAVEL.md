# Versão estável do Metas Estudo

## Versão estável atual

`20260717-sincronizacao-automatica-dispositivos-v32`

## Data

17/07/2026

## Atualização automática entre dispositivos

Esta versão corrige a situação em que um tempo salvo e enviado pelo computador permanecia desatualizado no celular enquanto a página já estava aberta.

O celular, tablet ou computador conectado ao Google Drive passa a consultar e mesclar alterações da nuvem automaticamente:

- ao abrir ou retornar para a página;
- ao recuperar a conexão com a internet;
- ao voltar o foco para a janela;
- a cada 20 segundos enquanto a página estiver visível e sem edição ativa.

A atualização periódica é suspensa durante a execução ativa do cronômetro e enquanto o usuário estiver digitando em um formulário, evitando interrupções. Ao finalizar ou pausar essas atividades, a próxima verificação incorpora as alterações existentes na nuvem.

A sincronização continua baseada na assinatura do conteúdo completo. Quando os conteúdos forem diferentes, ocorre uma mesclagem segura, e não uma substituição simples.

A mesclagem preserva:

- sessões de estudo e de questões;
- tempos registrados e totais acumulados;
- detalhes, observações e históricos;
- registros exclusivos existentes em cada dispositivo;
- sessões antigas sem identificador confiável.

Depois da mesclagem, os totais das metas são reconstruídos com base nas sessões preservadas. Antes de cada mesclagem permanece a criação de uma cópia local de segurança. Nenhum `localStorage` é limpo automaticamente.

## Mensagens motivacionais no aplicativo instalado

A versão mantém a correção do Cronômetro Livre no PWA. As mensagens aparecem nos marcos de 10%, 25%, 40%, 50%, 65%, 75%, 90% e 100% e permanecem visíveis por 30 segundos.

## Segurança dos dados

A atualização automática apenas consulta, mescla e salva os dados já existentes nos dispositivos e na nuvem. Ela não limpa o navegador nem remove sessões, metas ou históricos.
