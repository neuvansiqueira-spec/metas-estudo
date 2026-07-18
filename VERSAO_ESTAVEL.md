# Versão estável do Metas Estudo

## Versão estável atual

`20260717-material-cronometro-v40`

## Data

17/07/2026

## Material vinculado no cronômetro

O formulário aberto ao salvar o tempo do cronômetro passa a consultar a mesma fonte central de materiais utilizada pelo Plano do Dia.

A correção:

- reconhece materiais cadastrados diretamente na Biblioteca;
- reconhece materiais provenientes da Fábrica de Resumos;
- usa o vínculo pelo item do edital quando disponível;
- utiliza disciplina e assunto como alternativa segura de associação;
- elimina duplicações do mesmo arquivo;
- seleciona automaticamente o material já vinculado à meta ou, na ausência desse identificador, o primeiro material realmente disponível para o assunto;
- atualiza a lista ao trocar a disciplina ou o assunto no formulário do cronômetro.

Assim, quando o Plano do Dia mostra material disponível para uma meta, o formulário do cronômetro não deve mais apresentar apenas “Sem material vinculado”.

## Sincronização completa entre dispositivos

Permanece ativo o tratamento de inclusões, edições e exclusões como alterações reais do estado compartilhado. Exclusões continuam gerando marcadores de remoção, e conflitos de edição continuam sendo resolvidos pela alteração mais recente.

## Segurança

A atualização não altera nem remove materiais, metas, sessões, tempos, históricos, localStorage ou IndexedDB. Ela corrige somente a localização e a seleção do material no formulário de salvamento do cronômetro.

## Recursos preservados

A versão mantém a sincronização completa da v39, o espectro contínuo compacto, as mensagens motivacionais por 30 segundos, o aviso sonoro opcional e o login do Google Drive somente por ação do usuário.
