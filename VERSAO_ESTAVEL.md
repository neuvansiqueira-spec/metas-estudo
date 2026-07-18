# Versão estável do Metas Estudo

## Versão estável atual

`20260717-sincronizacao-completa-dispositivos-v39`

## Data

17/07/2026

## Sincronização completa entre dispositivos

A sincronização passa a tratar inclusões, edições e exclusões como alterações reais do estado compartilhado.

### Inclusões

Registros criados em dispositivos diferentes são reunidos sem que um conjunto substitua o outro.

### Edições

Cada registro alterado recebe uma data técnica de atualização. Quando dois dispositivos modificam o mesmo registro, prevalece a edição mais recente. Isso também permite reduzir valores numéricos; a sincronização não mantém automaticamente o maior número quando existe uma edição posterior.

### Exclusões

Toda exclusão gera um marcador de remoção sincronizável. Esse marcador impede que uma cópia antiga existente em outro dispositivo faça o registro apagado reaparecer. Caso o mesmo registro seja conscientemente recriado ou editado depois da exclusão, a alteração posterior pode restaurá-lo.

### Coleções protegidas

O mecanismo cobre disciplinas, estudos, itens do edital, metas diárias, sessões de questões, revisões, simulados, materiais, Banco de Questões, sessões do Banco, Caderno de Erros e itens da Fábrica de Resumos.

### Segurança

Antes das mesclagens continua sendo criada uma cópia local de segurança. A atualização não limpa localStorage, IndexedDB, tempos, sessões ou históricos.

## Recursos preservados

A versão mantém o espectro contínuo compacto, as mensagens motivacionais por 30 segundos, o aviso sonoro opcional e o login do Google Drive somente por ação do usuário.
