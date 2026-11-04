# Estado consolidado da feature — 04/11/2026

Este documento consolida as evidências da branch `feature/fase-5-testes-backend`.
O planejamento e os marcadores oficiais continuam exclusivamente em [roadmap.md](../roadmap.md).
Não cria uma fase nem substitui os contratos. Notas de etapas anteriores são histórico;
quando seu estado divergir deste resumo, a atualização posterior está indicada aqui.

## Resultados confirmados

| Validação | Resultado e origem |
|---|---|
| Testes isolados | 651 aprovados em 27 suítes na última execução registrada |
| Integração PostgreSQL/HTTP | 339 aprovados em 19 suítes, em execuções anteriores; não reexecutados nesta consolidação |
| Prisma validate | Aprovado anteriormente com Prisma 7.8.0 |
| Build Vite e ESLint | Aprovados anteriormente; lint sem erros ou warnings |
| Ensaio histórico sintético | Aprovado: 8 migrations antigas + 2 novas; 60 registros preservados em 12 tabelas |
| Fluxo principal no navegador | 9/9 cenários aprovados, conforme confirmação do usuário |
| RBAC no navegador | 6/6 verificações aprovadas, conforme confirmação do usuário |
| Padronização visual | Homologada pelo usuário |

As 339 verificações integradas consolidam execuções por suíte; não representam uma
nova execução conjunta. As contagens manuais são as confirmadas pelo responsável,
sem inventar screenshots, automação de navegador ou resultados adicionais. Esta
consolidação alterou somente documentação; não executou builds, testes ou SQL.

## Ambientes e proteção dos dados

| Ambiente | Destino | Política atual |
|---|---|---|
| Desenvolvimento | `qadb`, porta 5433 | Protegido; não usar para migrations, limpeza ou testes deste fechamento |
| Testes legados com dados | `qa_control_test`, porta 5434 | Protegido; não executar Jest legado, migrations, resets ou limpeza |
| Integração/homologação já utilizada | `qa_control_integration`, `127.0.0.1:5435` | Origem das 339 aprovações; agora preservar dados manuais. Não repetir migrations/testes destrutivos |
| Ensaio histórico independente | `qa_control_history_rehearsal`, `127.0.0.1:5436` | Descartável por finalidade, mas preservado com evidências até autorização de remoção |

O cluster da homologação é `7704309760569225254`; o do ensaio histórico é
`7704404591794282534`. Volumes exclusivos: `qa-control-integration_pgdata` e
`qa-control-history-rehearsal_pgdata`, respectivamente. Porta/nome não comprovam
isolamento: os procedimentos verificam também socket, usuário, cluster e mounts.
Nenhum banco protegido foi alterado durante o ensaio histórico.

Nenhuma instrução documental autoriza execução. Repetir ensaios requer autorização
específica, destino descartável aprovado e guardas compatíveis. O runner de integração
tem allowlist fixa em 5435; o runner histórico é exclusivo de 5436. Não intercambiar
arquivos de ambiente nem flexibilizar guardas. Os recursos existentes não devem ser
recriados, apagados ou reutilizados automaticamente. Não executar testes destrutivos
durante homologação manual.

## Contratos implementados

- `/projects` usa `projects`; `/projetos` continua usando o armazenamento legado de
  Test Cases. Nenhuma FK legada foi redirecionada.
- `project_id` opcional: omitido no PUT preserva, null remove, ID ativo vincula/troca.
- `cenarios` é JSONB, validado como JSON sem impor uma estrutura nova aos históricos.
  Omitido no PUT preserva; valor informado é persistido, inclusive `[]` e JSON null.
- Test Plans novos recebem `eligible`; preexistentes recebem `review_required`.
  Execução única transacional registra `executed_at` e o vínculo com Execution.
  Legados pendentes e planos executados não permitem edição/vínculos/reexecução.
- Admin exclui/restaura; QA cria/edita/consulta; Reader consulta. Restrições de estado
  permanecem aplicáveis a todos. A autorização é exigida no backend.

As duas migrations novas foram aplicadas em banco descartável vazio e depois
ensaiadas sobre baseline sintético antigo. Isso não significa que foram aplicadas
nos bancos protegidos nem autoriza aplicar em qualquer ambiente original.

## Limites que permanecem

- O ensaio histórico usa dados sintéticos pequenos. Não comprova todos os formatos
  reais possíveis, performance, duração de locks ou janela de manutenção em grande volume.
- Reports mantém a atribuição histórica limitada em execuções com múltiplas suítes;
  Dashboard mantém referências legadas e DDL preexistente em consulta. Sem reinterpretação.
- Auditoria legada de casos é best-effort, fora da transação; `/projects` audita na transação.
- JWT/sessões globais, incluindo invalidação imediata por mudança de papel, não foram reformulados.
- Não há UI administrativa de restauração de Projects nem liberação automática de planos legados.
- Filtro textual de Projects atua na página atual; o formulário edita o primeiro cenário,
  preservando os demais. Homologação manual não equivale a cobertura E2E automatizada.
- Rollout em ambiente original exige autorização, backup recuperável, suspensão de
  escritores antigos e coordenação entre schema e código. Não foi executado.

## Runtime e reprodução das verificações isoladas

A linha adotada e validada é **Node.js 22**, usando **22.17.1** nas execuções anteriores.
Na linha 22, usar **22.13.0 ou superior**: Vite 8 e Prisma 7.8 exigem pelo menos 22.12,
e ESLint 10 exige pelo menos 22.13. As ferramentas aceitam outras linhas em seus
manifests; isso não representa homologação dessas alternativas pelo projeto.
Os Dockerfiles usam `node:22-alpine`. Não há pin exato ou campo engines novo criado
por esta documentação. npm e dependências devem respeitar os lockfiles existentes.

Com dependências já disponíveis, o comando isolado documentado, da raiz, é:

```powershell
node --experimental-vm-modules backend/node_modules/jest/bin/jest.js --config backend/jest.isolated.config.js --rootDir . --testMatch '**/backend/tests/unit/**/*.test.js' '**/frontend/tests/*.test.cjs' --runInBand
```

Não carrega o setup de banco legado. Não substituir por `npm test`: a configuração
legada pode direcionar operações destrutivas a 5434. Nenhum comando foi executado aqui.

## Referências versionáveis

- [Persistência de Projects e Test Cases](PROJECTS-PERSISTENCE-CONTRACT.md).
- [Ciclo de vida de Test Plans](TEST-PLAN-LIFECYCLE.md).
- [Migrations e segurança de aplicação](MIGRATIONS.md).
- [Infraestrutura de integração](DISPOSABLE-INTEGRATION.md).
- [Ensaio histórico e comparação](HISTORICAL-MIGRATION-REHEARSAL.md).
- [Checklist de homologação](FEATURE-HOMOLOGATION-CHECKLIST.md).
- [Roteiro no navegador](BROWSER-HOMOLOGATION.md).
- [Matriz RBAC](RBAC-PERMISSIONS.md).
- [Testes frontend](../frontend/tests/README.md).

Credenciais, descritores de processos, snapshots e logs ficam fora do versionamento.
O relatório histórico versionável descreve método e resultados sem exigir acesso aos
artefatos locais. Skills e referências locais em `.claude/` são auxiliares opcionais;
os contratos acima e o código fornecem o contexto necessário em um checkout limpo.
