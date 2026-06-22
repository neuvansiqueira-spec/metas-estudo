# Regras CSS para estabilidade

Estas regras existem para evitar regressões de layout, principalmente textos quebrados em coluna, tabelas esmagadas e cards ilegíveis.

## Regras obrigatórias

- Evitar CSS global amplo.
- Preferir seletores por tela ou por componente específico.
- Não usar `overflow-wrap: anywhere` em cards, tabelas e painéis.
- Não usar `word-break: break-all`.
- Datas e números devem usar `white-space: nowrap`.
- Tabelas grandes devem ter rolagem horizontal.
- Cada tela deve ter correção isolada.

## Antes de alterar CSS

1. Identifique a tela afetada.
2. Use seletor específico para a tela ou componente.
3. Rode os testes automáticos.
4. Confira o checklist manual nas telas principais.
5. Em alteração perceptível, validar também no celular.
