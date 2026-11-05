# QA Control Center - Roadmap de Evolução

## Fonte oficial e interpretação do progresso

Este arquivo é a única fonte oficial de planejamento, prioridades e status do QA Control Center. A referência auxiliar da skill aponta para este documento e não mantém progresso independente.

Os marcadores existentes foram preservados. Uma marca de conclusão registra o acompanhamento anterior, mas não comprova aprovação funcional, cobertura atingida ou implantação. A revisão documental de 28/10/2026 foi estática, sem executar testes, migrations ou builds, e considerou o workspace atual, inclusive alterações locais preexistentes.

Consulte as observações ao final para limitações identificadas e validações necessárias. As observações não alteram status, não criam nova fase e não autorizam correções de código nem retomada de carga/performance adiada.

## Objetivo

Transformar o QA Control Center de um MVP funcional para uma plataforma corporativa de gerenciamento de testes, priorizando segurança, integridade dos dados, escalabilidade e experiência do usuário.

---

# FASE 1 - FUNDAÇÃO (FAZER PRIMEIRO)

## 1. Migrations e Versionamento do Banco ✅

### Objetivo

Eliminar dependência de scripts SQL manuais.

### Atividades

* Escolher ferramenta de migration (Prisma)
* Criar migration inicial do banco atual
* Implementar rollback
* Documentar processo de evolução do schema

### Motivo

Todo o restante do sistema depende de um banco confiável e versionado.

---

## 2. Validação de Inputs ✅

### Objetivo

Impedir dados inválidos de entrarem no sistema.

### Atividades

* Implementar Zod
* Validar Body
* Validar Params
* Validar Query Params
* Padronizar mensagens de erro

### Motivo

É um dos maiores ganhos de segurança e qualidade com baixo esforço.

---

## 3. Correção da Camada de Erros ✅

### Objetivo

Padronizar comportamento da API.

### Atividades

* Middleware global de erros
* Corrigir códigos HTTP
* Remover tratamento duplicado

### Motivo

Facilita manutenção e integração.

---

## 4. Configuração por Ambiente ✅

### Objetivo

Eliminar dependências locais.

### Atividades

* Remover URLs hardcoded
* Centralizar configurações
* Revisar variáveis de ambiente

### Motivo

Preparação para ambientes corporativos.

---

# FASE 2 - SEGURANÇA

## 5. Rate Limiting ✅

### Atividades

* Proteção contra brute force
* Limitação por IP
* Limitação por usuário

---

## 6. Fortalecimento da Autenticação ✅

### Atividades

* Melhorar fluxo de registro
* Forgot Password
* Reset Password
* Logout seguro

---

## 7. RBAC (Controle de Permissões) ✅

### Perfis

#### Administrador

* Gerencia usuários
* Gerencia projetos
* Acesso total

#### QA

* Gerencia testes
* Gerencia execuções

#### Leitor

* Consulta informações

### Motivo

Hoje qualquer usuário autenticado possui acesso total.

---

# FASE 3 - MODELAGEM E GOVERNANÇA

## 8. Relacionamentos de Usuários ✅

### Implementar

* User → Projetos
* User → Casos de Teste
* User → Execuções

### Motivo

Garantir rastreabilidade.

---

## 9. Audit Log ✅

### Registrar

* Quem alterou
* O que alterou
* Quando alterou

### Motivo

Essencial para uso corporativo.

---

## 10. Soft Delete ✅

### Implementar

* deleted_at
* Recuperação de registros

### Motivo

Evitar perda acidental de dados.

---

## 11. Constraints e Índices ✅

### Revisão

* NOT NULL
* UNIQUE
* Foreign Keys
* Índices

### Motivo

Melhorar integridade e performance.

---

# FASE 4 - ESCALABILIDADE

## 12. Paginação ✅

### Aplicar em

* [x] Projects (Projetos)
* [x] Test Cases (Casos de Teste)
* [x] Executions (Execuções)
* [x] Requirements
* [x] Test Plan
* [x] Test Suites
* [x] Histórico de execuções de Reports (Relatórios)

### Entrega e homologação da paginação — 29/10/2026

* [x] Integração frontend/backend das sete listagens, com Pagination.jsx e usePaginatedList.js.
* [x] Seleção de 20, 50 ou 100 registros por página, contagem total e navegação.
* [x] Loading, erro, retry, listas vazias, proteção contra respostas obsoletas e ajuste de página após exclusões.
* [x] Filtro global por projeto em Executions e ordenação global em Test Cases, aplicados antes da paginação, com total coerente e desempate estável.
* [x] Exclusão de Test Cases para administradores, com confirmação, bloqueio de duplicidade e feedback.
* [x] Histórico de Reports com envelope paginado aninhado; estatísticas globais e por suíte, seletores completos, geração e exportação integral preservados.
* [x] Homologação manual no navegador aprovada pelo usuário para as funcionalidades desta entrega.
* [ ] Paginação do resultado gerado em Reports e de POST /relatorios/generate: fora do escopo desta entrega.

A conclusão deste item abrange as sete listagens acima, incluindo somente o histórico de Reports. Não representa conclusão dos demais itens da Fase 4 nem das fases de testes. Este registro atualiza o diagnóstico estático anterior sobre paginação.

### Motivo

Preparação para grande volume de dados.

---

## 13. Refatoração da Service Layer ✅

### Objetivo

Separar regras de negócio do acesso ao banco.

### Atividades

* Quebrar arquivos grandes
* Criar serviços especializados
* Remover queries das rotas

---

## 14. Health Checks ✅

### Implementar

* Endpoint /health
* Verificação de banco
* Verificação de API

---

## 15. Docker para Produção ✅

### Atividades

* Build otimizado
* Configuração separada
* Ajustes de deploy

---

# FASE 5 - QUALIDADE DE SOFTWARE

## 16. Testes Backend

### Implementar

* Unitários ✅
* Integração ✅
* Cobertura mínima ✅
* Teste Carga / Performace (pendente — adiado a pedido)
* Testes de segurança ✅

---

### Validação relacionada à entrega de paginação

* [x] Execução anterior informada: 35 testes unitários e 81 testes de integração aprovados nas suítes selecionadas, usando clone PostgreSQL descartável para integração.
* [x] Validação local isolada desta entrega: 53 testes aprovados em cinco suítes, sem banco real; cobre paginação, filtros/ordenação, contratos legados, permissões de exclusão, CRUD de Projects e contratos da API frontend.
* [ ] Executar o novo cenário de desempate e preservação dos agregados em backend/tests/relatorios-stats.test.js, somente após autorização e confirmação de banco isolado. A aprovação anterior de integração não inclui esse cenário posterior.

Os testes isolados do módulo de API frontend usam Node com --experimental-vm-modules. Estes resultados não comprovam cobertura global nem concluem os itens 17 e 18. Carga/performance permanece adiada.

## 17. Testes Frontend

### Implementar

* Componentes
* Fluxos críticos
* Teste Carga / Performace 
* Testes de segurança

---

## 18. Testes E2E

### Implementar

* Login
* Cadastro
* Projetos
* Execuções
* Teste Carga / Performace
* Testes de segurança

---

# FASE 6 - EXPERIÊNCIA DO USUÁRIO

## 19. React Hook Form

### Benefícios

* Validação centralizada
* Menos código

---

## 20. Loading States

### Implementar

* Loading global
* Feedback visual

---

## 21. Error Boundaries

### Objetivo

Evitar quebra total da aplicação.

---

## 22. Busca e Filtros

### Implementar

* Pesquisa textual
* Filtros avançados
* Ordenação

---

# FASE 7 - MELHORIAS AVANÇADAS

## 23. Gerenciamento de Estado

### Avaliar

* Zustand
* React Query

---

## 24. Versionamento de Casos de Teste

### Funcionalidades

* Histórico
* Comparação
* Restauração

---

## 25. Importação e Exportação

### Formatos

* CSV
* XLSX
* JSON

---

## 26. Performance Frontend

### Implementar

* Lazy Loading
* Code Splitting
* Memoização

---

# FASE 8 - DOCUMENTAÇÃO E ADOÇÃO

## 27. Guia de Usuário

### Conteúdo

* Cadastro
* Projetos
* Casos de Teste
* Execuções

---

## 28. Guia de Instalação

### Conteúdo

* Ambiente local
* Docker
* Banco

---

## 29. Guia de Deploy

### Conteúdo

* Produção
* Variáveis de ambiente
* Backup

---

## 30. Diagramas

### Criar

* Arquitetura
* Banco de Dados
* Fluxos

---

# FASE 9 - CORPORATIVO

## 31. Responsividade Mobile

## 32. Acessibilidade

## 33. CI/CD

## 34. Quality Gates

## 35. Observabilidade

### Futuro

* Logs centralizados
* Métricas
* Monitoramento

---

# Meta Final

Disponibilizar uma plataforma corporativa de gerenciamento de testes, com autenticação segura, rastreabilidade completa, auditoria, documentação integrada e suporte a múltiplos projetos e equipes.

---

# Observações técnicas e validações necessárias

Esta seção complementa os itens existentes, preservando suas 9 fases, 35 itens e todos os marcadores originais. As notas a seguir registram o diagnóstico estático de 28/10/2026; consultar a atualização de 04/11/2026 ao final para pendências resolvidas. O detalhamento versionável está no [estado consolidado](backend/FEATURE-VALIDATION-STATUS.md), no [guia geral](README.md) e nos [contratos HTTP](API.md); skills locais são auxiliares opcionais.

| Itens relacionados | Evidência estática / pendência |
|---|---|
| 1 — Migrations | Prisma Migrate possui histórico versionado e a API usa pg. O Compose local ainda inicializa SQL legado. statsService executa ALTER TABLE em consulta. Aplicação das migrations e reversão compensatória precisam de validação em ambiente adequado; migrate resolve não desfaz dados. |
| 2 — Validação | Schemas Zod existem. Filtros de relatórios e audit log não têm validação uniforme; cenarios usava z.any() no diagnóstico original; resolvido em 04/11 por z.json(), preservando formatos históricos. A observação original sobre regex de IDs não certifica todos os endpoints. Atribuição a req.query precisa de revisão de compatibilidade com Express 5. |
| 3 — Erros | Handler global existe, mas statsService captura falhas e retorna zeros; frontend não rejeita uniformemente respostas HTTP de erro. Validar comportamento integrado. |
| 4 — Ambiente | Configuração centralizada existe com exceções de leitura direta de process.env. Frontend possui fallback localhost; confirmar URL da API no build de produção e coerência entre DATABASE_URL e DB_*. |
| 5 — Limites | Limitadores existem por IP e usuário, com armazenamento local ao processo. Testes usam limitadores isolados; composição de produção e múltiplas instâncias precisam de validação. |
| 6 — Autenticação | API possui logout e reset. Interface não chama revogação no logout; fluxo inspecionado não entrega e-mail. Reset não invalida JWTs anteriores e seu consumo não é atômico. Primeiro administrador é decidido por contagem, sujeito a concorrência. |
| 7 — RBAC | Papéis admin/qa/reader existem. A frase original “Hoje qualquer usuário autenticado possui acesso total” é motivação histórica anterior ao RBAC. Middleware usa papel do JWT sem revalidar usuário/papel atual; alteração de papel e exclusão não invalidam automaticamente tokens existentes. |
| 8 — Autoria/modelagem | created_by existe em projetos/casos, suítes, requisitos e execuções. projetos também representa casos de teste; requisitos não têm vínculo com projeto e planos não têm created_by. Não assumir agregação independente de projetos ou isolamento por tenant. |
| 9 — Auditoria | Registros existem, mas falhas de gravação são capturadas sem reverter a escrita. Vínculos, execução de plano, resultados, finalização e gestão de usuários não têm cobertura equivalente. Validar rastreabilidade e política de falhas. |
| 10 — Soft delete | CRUD e restauração existem; filtros não são uniformes em relatórios, estatísticas, relacionamentos e operações sobre resultados. Validar visibilidade e integridade após exclusão/restauração. |
| 11 — Integridade | Constraints e índices estão nas migrations; aplicação efetiva e aderência entre schema Prisma e SQL precisam de verificação. Execução de plano e atualização/finalização têm operações compostas sem transação abrangente. |
| 12 — Paginação | Implementada como opt-in, com consumidores ainda sem paginação; relatórios possuem envelope específico e consultas adicionais por execução. Validar comportamento, ordenação e volume. |
| 13 — Serviços | Serviços especializados foram extraídos; SQL e negócio continuam juntos. Geração Word permanece na rota. O diagnóstico original de PUT ignorando cenarios foi resolvido: JSON informado é persistido e omissão preserva o valor, sem backfill. |
| 14 — Health | Endpoint consulta SELECT 1 e retorna 200/503. Resposta pública inclui mensagem de erro do banco; não há prazo específico da consulta nesse serviço. Validar exposição e comportamento em indisponibilidade. |
| 15 — Docker | Existem estágios de produção, usuário não root no backend, Nginx e health checks. Provisionamento de schema e URL do frontend exigem validação; configuração existente não comprova deploy aprovado. |
| 16 — Backend | Há integração, segurança e dois arquivos unitários. Pisos configurados: statements 70%, branches 50%, functions 65%, lines 70%; cobertura atingida não foi medida nesta revisão. Aplicativo em teste injeta usuário e desativa limitadores; composição real precisa de cobertura apropriada. Carga/performance permanece adiada a pedido. |
| 17–18 — Frontend/E2E | Não foi identificada base automatizada no frontend inspecionado. Confirmar novamente ao retomar; definir cenários e critérios antes da implementação. |
| 20 e 22 — Experiência | Existem loading/feedback locais e alguns filtros/ordenação no cliente; não comprovam loading global ou busca/filtros abrangentes. |
| 25 — Importação/exportação | Exportação Word e relatório JSON existem; não equivalem à implementação integral de importação/exportação CSV/XLSX/JSON. |
| 27–30 — Documentação | README, API, SECURITY e MIGRATIONS já contêm documentação parcial. Guias e diagramas devem ser avaliados por seus critérios, sem marcar conclusão automaticamente. |
| 31–35 — Corporativo | Alguns media queries, logs básicos e pisos de cobertura existem; não comprovam responsividade abrangente, acessibilidade, CI/CD, quality gates completos ou observabilidade. |

## Orientação para continuidade

Recomenda-se avaliar primeiro as lacunas de sessão/autorização dos itens 6–7 e a integridade dos fluxos existentes. O próximo item funcional aberto na sequência é o 17, seguido pelo 18; a priorização efetiva depende do escopo autorizado e dos critérios de aceite. Não retomar automaticamente carga/performance do backend.

A indicação original de qa_control_test foi substituída: 5434 é protegido. Qualquer execução futura exige destino descartável aprovado e runner protegido compatível, preservando também 5433, 5435 e as evidências de 5436. Nenhuma observação desta revisão representa resultado de teste ou autorização para modificar aplicação, banco ou configurações.

## Atualização comprovada — 04/11/2026

Sem alterar os marcadores das fases: 651 testes isolados/27 suítes aprovados na
Última execução, 339 integrados aprovados anteriormente, Prisma validate, build e
lint aprovados. Ensaio histórico sintético: 8 migrations antigas + 2 novas, 60
registros preservados. Homologação manual confirmada pelo usuário: fluxo principal
9/9, RBAC 6/6 e padronização visual aprovada. Persistência de cenarios, catálogo
Projects, vínculo opcional e ciclo de vida de Test Plans estão implementados.

As observações antigas sobre ausência de testes frontend, dependências indisponíveis,
PUT de cenarios e ensaios pendentes são histórico; não representam o estado atual.
Os testes frontend isolados existentes não concluem automaticamente os itens 17/18
nem equivalem a E2E automatizado. O ensaio sintético não mede performance ou locks
em grande volume; carga/performance permanece adiada. Nenhum banco protegido foi
alterado no ensaio histórico. Rollout nos bancos originais continua não executado
e depende de autorização, backup e plano operacional. Ver [resultados, contratos e
limites](backend/FEATURE-VALIDATION-STATUS.md). Esta atualização é documental, não
uma nova execução de testes, migrations ou homologação.
