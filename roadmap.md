# QA Control Center - Roadmap de Evolução

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
