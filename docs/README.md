# Documentação técnica e funcional

Levantamento documental de 17/11/2026, baseado no código disponível na branch
`docs/requisitos-api-documentacao`, commit-base
`4a5b6788dfa3eafdee63a9294e320dc0e74bc282`, e no working tree inspecionado.
Esta entrega não executou testes, builds, serviços ou migrations.

## Navegação

| Documento | Finalidade |
|---|---|
| [Arquitetura](arquitetura.md) | Componentes, persistência, infraestrutura e limites |
| [Requisitos funcionais](requisitos/funcionais.md) | RF-001 a RF-026; comportamento, permissões e critérios propostos |
| [Requisitos não funcionais](requisitos/nao-funcionais.md) | RNF-001 a RNF-015; verificação, evidências e metas pendentes |
| [Regras de negócio](regras-de-negocio.md) | RN-001 a RN-019 e vínculos com requisitos/contratos |
| [Rastreabilidade](rastreabilidade.md) | Requisitos, regras, superfícies, testes e evidências |

## Autoridade e interpretação

- O [roadmap oficial](../roadmap.md) mantém planejamento, prioridades e progresso.
  Estes documentos não criam acompanhamento paralelo nem encerram fases.
- O código é a referência do comportamento implementado. Contratos especializados
  detalham semântica e histórico; notas antigas devem ser lidas com suas correções posteriores.
- **Implementado** significa localizado no código, não homologado, implantado ou
  livre de defeitos. **Parcial** indica escopo incompleto ou garantia limitada.
  **Planejado** identifica intenção do roadmap sem implementação correspondente.
- Critérios de aceite são verificações propostas para revisão do responsável,
  não novas aprovações nem autorização para executar operações.
- Limitações e bugs não são critérios de aceite aprovados. A matriz distingue
  presença de teste, resultado histórico, lacuna e ausência de execução nesta entrega.
- IDs são estáveis: não reutilizar um ID removido. RF-026 agrupa capacidades futuras
  identificadas no diagnóstico; desdobramentos futuros devem receber novos IDs.
- Metas sem aprovação estão **A DEFINIR**. Valores já configurados no código não
  constituem, por si, compromissos de desempenho ou disponibilidade.

## Contratos e referências especializadas

| Referência | Escopo |
|---|---|
| [Persistência de Projects e Test Cases](../backend/PROJECTS-PERSISTENCE-CONTRACT.md) | Namespaces, vínculo opcional, cenários e transações |
| [Ciclo de Test Plans](../backend/TEST-PLAN-LIFECYCLE.md) | Elegibilidade, execução única e histórico |
| [Permissões RBAC](../backend/RBAC-PERMISSIONS.md) | Matriz por recurso e evidências históricas |
| [Estado consolidado](../backend/FEATURE-VALIDATION-STATUS.md) | Evidências anteriores e ambientes protegidos |
| [Migrations](../backend/MIGRATIONS.md) | Histórico SQL, aplicação e preservação de dados |
| [Integração descartável](../backend/DISPOSABLE-INTEGRATION.md) | Procedimentos e guardas; não é autorização de execução |
| [Homologação no navegador](../backend/BROWSER-HOMOLOGATION.md) | Roteiro e limites de validação manual |
| [Testes frontend](../frontend/tests/README.md) | Executor isolado e limitações de mocks |
| [API.md](../API.md) | Guia existente, com divergências a revisar |
| [Swagger](../backend/src/swagger.js), [OpenAPI estático](../openapi.json) | Fontes existentes, ainda não sincronizadas nesta entrega |
| [Postman](../QA_Control_Center.postman_collection.json) | Coleção existente; atualização contratual pendente |

Não copiar contratos completos para múltiplos documentos. Esta camada identifica
requisitos e aponta para a fonte especializada; Swagger/OpenAPI e Postman serão
tratados em entregas próprias. Não incluir credenciais nem evidências sensíveis.

## Decisões pendentes

Revisão dos critérios propostos; política de sessão/revogação; critérios de
segurança integrada, navegadores/acessibilidade e metas de carga/recursos;
destinação durável de evidências hoje em `/tmp`; atualização dos contratos HTTP.
E2E Playwright permanece futuro, em repositório separado, conforme roadmap.

## Revisão documental antes do commit

Revisão estática dos seis documentos: IDs preservados (26 RFs, 15 RNFs e 19 RNs),
futuro separado em RF-026, namespaces Projects/Test Cases mantidos e ausência de
vínculo Requirements–Projects explicitada. Códigos de validação HTTP foram
distinguidos dos erros de serviço; classificação por migration não declara estado
de banco consultado. A matriz qualifica mocks, identidade injetada e lacunas por
cenário. Nenhum critério foi promovido a homologado por existência de teste.
