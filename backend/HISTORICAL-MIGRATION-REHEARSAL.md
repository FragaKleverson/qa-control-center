# Ensaio de atualização com histórico sintético — 04/11/2026

Resultado: **APROVADO para o conjunto sintético descrito abaixo**. Não constitui
autorização de atualização de desenvolvimento, testes existentes ou homologação.
Não foi copiado nenhum dado desses ambientes. O fluxo da aplicação não foi alterado.

## Ambiente exclusivo preservado

- Container: `qa-control-history-rehearsal-db`.
- Compose: `docker-compose.history-rehearsal.yml`, opt-in `history-rehearsal`.
- Banco: `qa_control_history_rehearsal`.
- Usuário: `qa_history_runner`, credencial exclusiva gerada aleatoriamente.
- Publicação: `127.0.0.1:5436` → PostgreSQL interno `5432`.
- Volume: `qa-control-history-rehearsal_pgdata`, criado neste ensaio.
- Rede: `qa-control-history-rehearsal_default`, criada neste ensaio.
- Cluster: `7704404591794282534` (diferente do cluster de homologação).
- Saúde final: `healthy`; identidade novamente confirmada após a atualização.
- Imagem `postgres:15` já disponível; sem download, instalação ou restart de recursos existentes.

Nenhuma conexão PostgreSQL ou escrita deste procedimento foi direcionada às portas
5433, 5434 ou 5435. Os comandos Docker inspecionaram recursos existentes, mas criaram
somente os recursos exclusivos acima. Não remover o ambiente nem evidências sem autorização.

## Método executado

1. Branch `feature/fase-5-testes-backend` confirmada e alterações locais preservadas.
2. Porta, container, volume e rede confirmados livres antes do provisionamento.
3. Credenciais em `backend/.env.history-rehearsal.local`, ignorado pelo Git. Não publicar.
4. Identidade obtida no container novo e validada novamente pelo Node Windows 22.17.1,
   incluindo socket efetivo, usuário, banco, porta interna e `pg_control_system()`.
5. Confirmado schema `public` vazio. O Prisma local aplicou realmente as oito migrations
   de `0_init` até `20260806000001_fix_audit_log_action_constraint`.
6. Ausência de `projects`, `projetos.project_id`, `execucoes.plan_id` e dos campos novos
   dos planos confirmada antes das fixtures.
7. Inseridos 60 registros sintéticos em transação, respeitando constraints antigas.
8. Capturado snapshot de todos os campos de todas as linhas das 12 tabelas, sequências,
   constraints, índices e hashes SHA-256 determinísticos.
9. Aplicada isoladamente `20261030000000_add_plan_execution_guard` e capturado snapshot.
10. Aplicada `20261030000001_create_projects_and_optional_case_link` e comparado o estado final.
11. Histórico Prisma, checksums dos SQL e conclusão de todas as migrations conferidos.
12. Métodos reais de leitura dos serviços executados contra conexão verificada em
    transação READ ONLY. Snapshot posterior confirmou ausência de alteração dessas leituras.

O runner usa uma cópia local ignorada dos SQL, byte a byte idêntica à origem, em
`test-results/history-rehearsal/prisma/migrations`. Essa cópia é ampliada de 8 para
9 e depois 10 migrations. Assim `migrate deploy` aplica somente a etapa pretendida.
Nenhuma migration foi marcada artificialmente como aplicada. Não houve reset, db push
ou limpeza manual. A oitava migration antiga contém seu DROP CONSTRAINT versionado,
executado pelo Prisma somente neste banco novo; não houve DROP manual.

## Comparação antes/depois

| Tabela | Antes | Depois | Campos originais/IDs |
|---|---:|---:|---|
| users | 3 | 3 | Idênticos |
| password_reset_tokens | 1 | 1 | Idênticos |
| revoked_tokens | 1 | 1 | Idênticos |
| projetos | 5 | 5 | Idênticos |
| test_suites | 3 | 3 | Idênticos |
| requirements | 4 | 4 | Idênticos |
| test_plans | 5 | 5 | Idênticos |
| execucoes | 8 | 8 | Idênticos |
| test_suite_cases | 6 | 6 | Idênticos |
| test_plan_suites | 4 | 4 | Idênticos |
| execution_results | 16 | 16 | Idênticos |
| audit_logs | 4 | 4 | Idênticos |
| projects (nova) | inexistente | 0 | Nenhuma classificação automática |

Os hashes dos campos originais coincidiram nas 12 tabelas. A comparação removeu
**somente** as colunas adicionadas pelas duas migrations, após validar seus valores:

- Cinco casos: `project_id IS NULL`.
- Cinco planos, inclusive excluído: `executed_at IS NULL` e `review_required`.
- Oito execuções: `plan_id IS NULL`.
- Default para futuros planos: `eligible`, confirmado no catálogo.
- Conteúdo JSONB preservado: SQL NULL, array vazio, arrays de cenários, objetos
  históricos e estruturas alternativas aceitas pelo schema antigo; sem conversão.
- Preservados autoria opcional, ambientes antigos/nulos/vazios, oito estados de
  execução, finalização, datas, auditoria CREATE/UPDATE/DELETE/RESTORE e soft-delete.
- Todas as constraints e definições de índices antigas e todas as sequências antigas
  permaneceram idênticas; os vínculos legados continuam referindo `projetos.id`.

Novas constraints validadas: FK `execucoes_plan_id_fkey` com RESTRICT, unicidade
`execucoes_plan_id_key`, CHECK de classificação, PK de projects, FK de autoria,
CHECK de nome e `projetos_project_id_fkey` com RESTRICT. Índices verificados:
`idx_projects_deleted_created_id`, `idx_projects_created_by`, `idx_projetos_project_id`,
mais os índices das novas PK/UNIQUE.

Consultas reais aprovadas: Projects, casos legados, suítes, planos, execuções,
Requirements e Reports, tanto listagens sem paginação como opt-in. Também foram
consultados casos de suíte, suítes de plano, resultados e geração de relatório.
Foi usado somente um adaptador de conexão no processo do ensaio, sem alterar os
serviços nem carregar a configuração padrão da aplicação.

## Evidências locais e limitações

Diretório preservado e ignorado pelo Git: `backend/test-results/history-rehearsal/`.
Contém `before.json`, `after-plan-migration.json`, `after.json`, `result.json`,
`identity.json`, manifesto SHA-256 das migrations, histórico e stdout/stderr/código
de saída Prisma por etapa, hashes dos arquivos preexistentes e evidências Docker
de volume e publicação. Snapshots incluem somente dados sintéticos; não publicar
o arquivo de credenciais ou as configurações locais. Os logs Prisma foram sanitizados.

As três execuções Prisma terminaram com código 0. Não houve perda de registro ou
divergência inesperada. Não foi necessária correção de regra de negócio ou migration.
As 26 verificações isoladas novas das guardas passaram. A regressão final aprovou
651 testes isolados em 27 suítes. A sintaxe dos scripts Node foi verificada e a
comparação SHA-256 não encontrou alteração em nenhum arquivo preexistente do manifesto.
O driver pg emitiu um aviso de depreciação por consultas concorrentes no cliente
dedicado usado pelo harness de leitura/paginação; as consultas e asserções passaram.
Isso não é uma divergência dos dados. O método Dashboard não foi invocado porque
contém DDL preexistente em leitura (`ALTER TABLE`); não foi alterado por este ensaio.

Este conjunto pequeno não mede duração de locks ou performance em volume de produção,
nem prova cobertura de toda variante histórica possível. Não substitui backup
recuperável, plano operacional e autorização separada antes de atualização de banco real.

## Operação controlada e futura revisão

Scripts novos não têm fallback para os ambientes protegidos. `history-rehearsal-guard.js`
exige destino literal, concordância URL/pool, autorização efêmera e cluster registrado;
recusa PG*, DB_NAME e modos de integração/homologação herdados. O gate Prisma exige
marca de verificação com validade de 60 segundos imediatamente antes do subprocesso.
Existe a mesma janela residual entre preflight e conexão nativa Prisma: não trocar
containers, publicação de portas ou processos durante a execução. A guarda não é
fronteira contra um operador capaz de editar os próprios scripts/configurações.

Inspeção: `node scripts/run-history-rehearsal.js check`, em backend, com autorização
efêmera `QA_HISTORY_AUTHORIZATION=authorized`; executa somente leitura.
`prepare`, `register`, provisionamento, `baseline` e `upgrade` foram executados nesta
sessão e não devem ser repetidos sobre o ambiente preservado. `baseline` exige banco
vazio; `upgrade` exige exatamente o histórico anterior esperado. Um novo ensaio exige
novo destino aprovado e revisão explícita das guardas, sem reutilizar este volume.

Antes do PR: revisar arquivos/diff e evidências, selecionar somente arquivos relacionados,
registrar homologação visual/RBAC já realizada pelo responsável e revisar limitações
operacionais de rollout. Não houve commit, push, merge ou mudança de branch neste ensaio.
