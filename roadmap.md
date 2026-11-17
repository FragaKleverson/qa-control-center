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

**Status atual: CONCLUÍDO COM RESSALVAS — 13/11/2026, por aceite explícito do responsável.** Escopo mínimo aceito: regressão automatizada, lint, build e auditorias estáticas de segurança e performance. Não equivale a segurança integrada ou performance em navegador validadas; a Fase 5 permanece aberta.

### Implementar

* Componentes
* Fluxos críticos
* Teste Carga / Performace 
* Testes de segurança

### Consolidação do item 17 — 13/11/2026

**Registro histórico: status PARCIAL na consolidação inicial.** Os marcadores e as pendências daquela revisão foram preservados abaixo; o aceite posterior consta na seção de encerramento com ressalvas. BUG-001 a BUG-004 permanecem atuais e pendentes. Não corrigir os defeitos nesta etapa.

#### Evidências de validação

- [x] Regressão conjunta frontend: **15/15 suítes e 220/220 testes aprovados**, sem reprovados ou ignorados; código de saída 0. Inclui 14 suítes em `frontend/tests` e `backend/tests/unit/frontend-api-pagination.test.js`.
- Ambiente: WSL Ubuntu, Node Linux **26.13.0**, Jest **30.4.2**, executor temporário Linux; sem cobertura global, banco ou serviços externos.
- Evidências: `/tmp/qa-frontend-regression.lgmn1x3q/{summary.json,jest-results.json,execution.log,preservation-check.json}`. Arquivos, HEAD, índice e estado do Git preservados.
- [x] ESLint frontend aprovado com a configuração atual: **53 arquivos, 0 erros, 0 avisos**, `--max-warnings 0`, sem fix/cache; ESLint **10.2.1**, Node Linux **26.13.0**, código de saída 0.
- Evidências ESLint: `/tmp/qa-frontend-eslint.e_i8zofq/{summary.json,eslint-results.json,execution.log,preservation-check.json}`. Nenhum arquivo do projeto foi alterado pela validação.
- As aprovações não significam que os quatro problemas foram corrigidos. Os testes de caracterização registram limitações existentes, não aprovação funcional desses comportamentos. Artefatos em `/tmp` são temporários; preservar/exportar as evidências antes de sua remoção, sob autorização.

#### Backlog de problemas conhecidos — item 17

Prioridades sugeridas para triagem futura; todos os problemas permanecem pendentes. Esta seção centraliza os quatro registros, sem criar outro acompanhamento independente.

| ID / componente | Descrição e impacto | Prioridade sugerida | Evidência existente | Critério de correção futura | Status |
|---|---|---|---|---|---|
| BUG-001 — `frontend/src/pages/TestSuites.jsx` | Respostas antigas de carregamento/mutação podem sobrescrever os casos da suíte atual após trocar a seleção: a verificação de montagem não identifica a suíte/requisição vigente. Pode exibir vínculos no contexto errado e induzir operações incorretas. | P1 | Leitura de `openCasesModal`, `handleAddCase` e `handleRemoveCase`; o teste de resposta após desmontagem em `frontend/tests/testSuites.test.cjs` não reproduz a troca A → B. | Reproduzir A → B com respostas fora de ordem; ignorar resultados e feedback de sessões antigas sem alterar dados ou seleção de B; adicionar regressão específica. | PENDENTE — identificado por leitura, pendente de reprodução específica. |
| BUG-002 — `frontend/src/pages/Executions.jsx` | Callbacks antigos de status/comentário continuam chamando a API após finalização; os handlers verificam papel, mas não o estado finalizado. Gera tentativas indevidas e depende da proteção do servidor. | P2 | Dois cenários de callbacks antigos em `frontend/tests/executions.test.cjs`, com rejeição simulada da API. A proteção real do backend não é comprovada por esses testes. | Conferir o estado atual antes da edição, sem chamada indevida após finalização; preservar a proteção backend e validá-la separadamente em destino autorizado. Atualizar a caracterização para regressão do comportamento corrigido. | PENDENTE — comportamento caracterizado por testes. |
| BUG-003 — `frontend/src/pages/Requirements.jsx` | Ao receber JSON sem `id`, chama `res.text()`, incompatível com o retorno do cliente HTTP. Produz exceção interna e mensagem genérica, embora não anuncie sucesso. | P2 | Leitura de `handleCreateRequirement` e `requirementsAPI.create`; cenário JSON sem `id` em `frontend/tests/requirements.test.cjs`. | Tratar explicitamente resposta JSON inválida sem chamar `text()`; manter campos/modal, informar erro e não anunciar sucesso ou recarregar a lista. | PENDENTE — comportamento caracterizado. |
| BUG-004 — `frontend/src/pages/Reports.jsx` | Exceção em `a.click()` desvia o fluxo antes de `a.remove()` e `URL.revokeObjectURL()`. Deixa link temporário e URL Blob sem limpeza, com retenção de recursos. | P2 | Cenário de exceção no clique em `frontend/tests/reports.test.cjs`: ausência de remoção/revogação e apresentação de erro. | Garantir limpeza do link e revogação da URL criada também na exceção, sem sucesso indevido; testar sucesso e falhas após criação da URL. | PENDENTE — comportamento caracterizado. |

#### Histórico das validações pendentes antes do aceite com ressalvas

- [ ] **Build frontend atual no WSL:** verificar dependências Linux, desabilitar leitura de `.env` e gerar artefatos exclusivamente em `/tmp`; não instalar dependências automaticamente.
- [ ] **Avaliação mínima de segurança:** revisar sessão/401, permissões e efeitos dos handlers; explicitar os limites de mocks e registrar a triagem dos defeitos. Aceitação ou adiamento de riscos exige decisão explícita; não presumir que os testes isolados comprovam segurança integrada.
- [ ] **Avaliação mínima de performance:** definir e aprovar cenários, massas sintéticas, ambiente, repetições e limites de aceite; medir renderização/listagem/relatórios de forma reproduzível. Tempo do Jest não é métrica de performance do produto.

ESLint e regressão conjunta possuem evidência atual e não são pendências desta consolidação. Novas alterações futuras podem exigir revalidação. Os critérios mínimos de segurança e performance ainda precisam ser definidos antes de concluir o item 17.

O item 18 será realizado por último, em repositório Git separado, provisoriamente `qa-control-center-e2e`. Não instalar Playwright ou criar E2E no repositório principal; não criar o repositório separado nesta etapa. Essa decisão não elimina as validações pendentes do item 17 nem conclui a Fase 5.

### Encerramento do item 17 com ressalvas — 13/11/2026

O responsável aceitou explicitamente regressão automatizada, lint, build e auditorias estáticas como escopo mínimo desta etapa. Este aceite supera o status parcial e o checklist histórico acima; não declara corrigidos os defeitos nem executadas as avaliações dinâmicas originalmente propostas. Não houve correção funcional nesta consolidação.

#### Evidências aceitas no encerramento

- [x] **Regressão conjunta:** 15/15 suítes e 220/220 testes PASS, nenhum reprovado/ignorado, código 0; WSL Ubuntu, Node Linux 26.13.0 e Jest 30.4.2. Evidências: `/tmp/qa-frontend-regression.lgmn1x3q/`.
- [x] **ESLint:** 53 arquivos, 0 erros e 0 avisos, código 0; configuração vigente, `--max-warnings 0`, sem fix/cache. Evidências: `/tmp/qa-frontend-eslint.e_i8zofq/`.
- [x] **Build Vite 8.0.10 isolado:** PASS, código 0, 63 módulos transformados, cinco artefatos; execução total de 8,920 s. Dependências temporárias e guardas de isolamento, sem `.env`, saída/cache em `/tmp`. Evidências: `/tmp/qa-frontend-build-execution.kf0lor3e/{summary.json,execution.log,preservation-check.json}`; artefatos em `/tmp/qa-frontend-build-deps.1d4v0z1u/dist/`. Aviso de tempo em plugins devido principalmente à guarda temporária; não usado como desempenho do produto.
- [x] **Auditoria estática de segurança:** rotas, sessão/logout, tokens, respostas 401/403, RBAC visual, HTML dinâmico e indicadores de segredos revisados. Não foi identificada vulnerabilidade crítica comprovada; nenhum indicador de segredo nos padrões pesquisados em fontes/artefatos e nenhum uso de HTML dinâmico inseguro encontrado. Não é certificação de ausência de vulnerabilidades, segredos ou validação integrada; arquivos `.env` não foram lidos.
- [x] **Avaliação estática de performance:** cinco artefatos, 364.523 bytes no total; JS 338.038 bytes e CSS 11.473 bytes, com cerca de 96,62 kB/3,02 kB gzip no log do Vite. Imports de páginas, paginação e coleções auxiliares revisados. Sem medição de renderização, interação, memória ou rede em navegador; tempo de build/Jest não mede performance da interface.

A regressão aprovada inclui testes de caracterização dos defeitos existentes. BUG-001 a BUG-004 continuam PENDENTES, com prioridades e critérios inalterados. A auditoria estática e o aceite das ressalvas não comprovam a proteção real do backend nem corrigem os problemas. Evidências em `/tmp` são efêmeras; sua preservação externa exige autorização própria.

#### Achados adicionais de segurança e performance

| ID / prioridade sugerida | Evidência | Impacto | Recomendação futura | Status |
|---|---|---|---|---|
| SEC-01 — P2 | `AuthProvider.jsx` mantém token/perfil em `localStorage`; `isAuthenticated` usa presença do token; `ProtectedRoute.jsx` consome esse estado. | Token acessível a JavaScript em caso de XSS; perfil local pode alterar controles visuais. Não representa autorização do servidor. | Revisar estratégia de sessão e validar expiração/identidade; manter autorização obrigatória no backend. | PENDENTE — risco identificado por análise estática. |
| SEC-02 — P2 | `AuthProvider.logout` limpa somente armazenamento/estado; o cliente frontend não chama revogação backend. | Encerrar a sessão visual não comprova invalidar um token previamente obtido. | Definir contrato de logout e integrar revogação quando aplicável; validar efeito real no servidor separadamente. | PENDENTE — logout local identificado; revogação backend não comprovada. |
| SEC-03 — P2 | Inicialização de `AuthProvider.jsx` usa `JSON.parse` do usuário armazenado sem tratar conteúdo inválido. | Armazenamento malformado pode interromper a inicialização da interface. | Tratar sessão inválida sem falha não capturada e adicionar regressão específica. | PENDENTE — risco identificado por análise estática. |
| SEC-04 — P2 para implantação | `services/api.js` possui fallback `http://localhost:3001`, também encontrado no artefato produzido sem `.env`. | O build de validação não define um destino HTTPS de implantação; pode apontar para serviço local incorreto se distribuído sem configuração adequada. | Definir/verificar URL apropriada no build de implantação; não tratar este artefato como release homologada. | PENDENTE — configuração de implantação a validar. |
| PERF-01 — P3 | `AppRoutes.jsx` importa as páginas antecipadamente, sem lazy loading por rota; build gerou um bundle JS principal. | Todas as páginas participam da carga inicial; custo depende do dispositivo e da rede, ainda não medido. | Medir antes de decidir divisão por rota; adotar lazy loading somente se justificado. | PENDENTE — risco estático, sem medição em navegador. |
| PERF-02 — P2 | Listagens principais usam `usePaginatedList`, mas seletores auxiliares e resultados gerados podem carregar/renderizar coleções completas. | Grandes volumes podem elevar transferência, memória e trabalho de renderização. | Medir com massas representativas e definir limites; paginar/limitar onde necessário. | PENDENTE — risco estático de volume. |

#### Validações futuras e limites do aceite

- [ ] Validar segurança integrada em ambiente autorizado: autenticação/autorização real, 401/403, logout/revogação e sessão, sem confundir restrição visual com barreira de segurança do servidor.
- [ ] Definir massas, cenários, ambiente e limites de aceite e executar testes dinâmicos de performance em navegador, incluindo renderização, interação, memória e rede. A avaliação estática aceita nesta etapa não substitui essas medições.
- [ ] Tratar o backlog BUG-001 a BUG-004 e SEC-01 a SEC-04/PERF-01 a PERF-02 em entregas futuras autorizadas; não reclassificar pendências como corrigidas pela aprovação dos testes.

Essas ressalvas foram aceitas para concluir somente o item 17 no escopo mínimo acima. O item 18 permanece PENDENTE: Playwright E2E será realizado posteriormente, por último, no repositório separado provisoriamente denominado `qa-control-center-e2e`. Não instalar Playwright nem criar testes E2E no repositório principal. O próximo passo é planejar o escopo, contratos, dados sintéticos e isolamento do E2E, sem criar o novo repositório ou executar testes sem autorização.

#### Critérios da Fase 5 ainda não atendidos

A **Fase 5 NÃO está concluída**. Além do item 18, permanecem o cenário integrado de desempate/agregados em `backend/tests/relatorios-stats.test.js` e a cobertura mínima backend: a última medição registrada (22 suítes/537 testes) foi 59,11% statements, 52,63% branches, 58,36% functions e 58,47% lines, frente aos pisos 70/50/65/70. Statements, functions e lines continuam abaixo do mínimo; o marcador histórico do item 16 não comprova seu atendimento atual. Evidência histórica dessa medição: `/tmp/qa-unit-coverage-final.ki8kats2/`. Carga/performance backend permanece adiada a pedido, sem autorização implícita para retomada. Não há nova execução backend nesta atualização.

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
