# Regras para alterações no projeto

1. Antes de alterar código, identifique qual versão ou arquivo está realmente ativo no site. Não altere arquivos históricos ou versões antigas sem confirmar que são usados pela versão atual.
2. Localize os símbolos relacionados à tarefa com as ferramentas de inspeção de repositório disponíveis.
3. Antes de editar, consulte contexto, dependências, pontos de chamada e raio de impacto sempre que essas informações estiverem acessíveis.
4. Identifique os testes relacionados antes da alteração.
5. Somente depois dessa análise, modifique o código.
6. Após modificar, execute os testes relevantes e verifique regressões sempre que houver ambiente de execução disponível.
7. Revise o diff final e confirme o espelhamento entre os arquivos publicados da raiz e de `docs/` quando aplicável.
8. Não publique, faça push ou merge sem solicitação expressa.
9. Prefira alterações mínimas e localizadas, preservando funcionalidades existentes.
