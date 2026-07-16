# Versão estável do Metas Estudo

## Versão estável atual

`20260716-agrupar-materiais-sem-duplicacao-v1`

## Data

16/07/2026

## Restauração de abertura estável

Esta versão consolida visualmente a biblioteca da aba Materiais por disciplina, assunto e módulo, sem alterar registros persistidos. Arquivos físicos equivalentes são exibidos uma única vez e formatos distintos permanecem disponíveis no mesmo cartão.

## Telas principais cobertas pela estabilidade

- Dashboard
- Central de Metas
- Plano do Dia
- Histórico de Questões
- Histórico Geral
- Revisões
- Progresso
- Simulados
- Backup
- Menu mobile
- PWA no celular

## Regras para futuras alterações

1. Não adicionar funcionalidades durante a fase de estabilização sem criar um plano separado.
2. Não alterar regras de cálculo sem testes e validação manual.
3. Não apagar dados do usuário e não limpar `localStorage` automaticamente.
4. Toda alteração visual deve ser isolada na tela afetada e testada no desktop e no celular.
5. Toda correção deve preservar a navegação por hash e o salvamento local existente.
6. Antes de publicar, executar os testes automáticos e percorrer o checklist manual.
7. Se uma alteração afetar cache, assets ou versão exibida, atualizar também service worker, query string de CSS/JS e rodapé.

## Aviso sobre CSS global

Não alterar CSS global amplo sem teste. Regras globais podem quebrar várias telas ao mesmo tempo, especialmente cards, tabelas, menus e painéis. Qualquer ajuste de CSS deve ser o mais específico possível para a tela ou componente corrigido.
