# Regras para alterações no projeto

1. Antes de qualquer alteração de código, use obrigatoriamente o CodeGraph.
2. Primeiro, identifique qual versão ou arquivo está realmente ativo no site. Não altere arquivos históricos ou versões antigas sem confirmar que são usados pela versão atual.
3. Use o CodeGraph para localizar símbolos relacionados à tarefa.
4. Antes de editar, consulte contexto, callers, callees, dependências e raio de impacto.
5. Identifique os testes relacionados antes da alteração.
6. Somente depois dessa análise, modifique o código.
7. Após modificar, execute os testes relevantes e verifique regressões.
8. Revise o diff e, quando aplicável, use novamente o CodeGraph para avaliar o impacto final.
9. Não publique, faça push ou merge sem solicitação expressa.
10. Prefira alterações mínimas e localizadas, preservando funcionalidades existentes.
