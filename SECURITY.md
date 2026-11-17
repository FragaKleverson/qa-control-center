# Política de segurança — QA Control Center

Revisão estática de 17/11/2026. O projeto não possui implantação de produção
homologada nesta documentação. Mecanismos presentes no código, resultados
históricos e recomendações de implantação são categorias diferentes. Não há
certificação de conformidade ou garantia de ausência de vulnerabilidades.

## Reporte responsável

Não publicar credenciais, JWTs, dumps, dados pessoais, URLs com senha ou provas
exploráveis em issues públicas. Não testar credenciais encontradas no histórico.

1. Solicitar ao mantenedor um canal privado para relato e envio de evidência
   sanitizada. Não há contato privado dedicado, SLA de resposta ou versões com
   suporte de segurança formalmente definidos no repositório.
2. Se o GitHub oferecer reporte privado de vulnerabilidade habilitado para este
   repositório, usar esse recurso; sua disponibilidade não foi consultada aqui.
3. Informar versão/commit, componente, pré-condições, impacto e reprodução mínima
   com dados sintéticos. Não explorar servidores ou bancos sem autorização.
4. Coordenar correção, revisão e divulgação com o mantenedor. Não há prazo de
   embargo ou compromisso de atendimento aprovado nesta política.

## Autenticação e sessão implementadas

Fontes: [serviço](backend/src/services/authService.js),
[middleware JWT](backend/src/middleware/auth.js),
[validators](backend/src/validators/auth.js) e [contrato](API.md).

- Senhas usam bcryptjs; custo padrão 12, configurável por `BCRYPT_ROUNDS`.
  Cadastro/reset HTTP exigem 8–128 caracteres; isso não é recomendação de força
  suficiente para toda implantação. Login não aceita papel escolhido pelo cliente.
- JWT inclui identidade, papel, JTI e expiração configurada (padrão 8h). Middleware
  verifica assinatura/expiração; com JTI consulta blocklist e rejeita revogação.
  Falha nessa consulta não autentica; erro vai ao handler, sem promessa geral de 503.
- Cadastro exige `x-register-token`/`REGISTER_TOKEN`, mesmo sem JWT. Primeiro Admin
  é determinado por contagem de usuários sem serialização do bootstrap concorrente.
- Logout da API registra JTI; tokens legados sem JTI não têm revogação individual
  por essa blocklist. Logout visual só limpa armazenamento/estado, sem chamar a API.
- Forgot/reset persistem hash SHA-256 de token aleatório e verificam expiração/uso.
  Não há envio de e-mail implementado. `_dev_token` só é retornado fora de produção
  quando há usuário. Reset não é consumo transacional abrangente nem invalida
  automaticamente todos os JWTs anteriores.
- UI guarda token/perfil em localStorage. `ProtectedRoute` usa presença do token,
  não valida identidade/expiração. 401 em chamada protegida limpa a sessão e
  redireciona; 403/erro de rede não têm esse efeito. Não há timer de expiração.

Mudança de papel, exclusão de conta e reset não invalidam automaticamente JWTs já
emitidos. O papel é lido do JWT, sem consulta geral do usuário atual. Claims não
possuem schema completo no middleware. Revisar política de sessão antes de exposição.

## Autorização e limites

A autorização do backend é obrigatória; ocultar botões ou mudar o perfil local não
concede permissão no servidor. [Matriz RBAC](backend/RBAC-PERMISSIONS.md):

- Admin/QA criam/editam e adicionam vínculos; Reader consulta.
- Exclusão, restauração e remoção de vínculos exigem Admin; administração de
  usuários também. Geração/exportação de relatórios exige Admin/QA.
- Admin não altera o próprio papel nem exclui a própria conta. Restrições de estado
  dos planos continuam aplicáveis a todos; restauração não desbloqueia reexecução.
- Não há isolamento geral por proprietário, equipe ou tenant. Autoria não equivale
  a controle de acesso por registro.

`NODE_ENV=test` injeta identidade nos recursos de negócio e desativa limitadores.
**Nunca usar esse modo para servir usuários.** Teste HTTP com identidade injetada
não demonstra autenticação integrada de produção.

## Proteções HTTP e exposição

[app.js](backend/src/app.js) utiliza Helmet, CORS configurável, HPP, limite JSON
500kb e limitadores por IP/usuário e rotas de autenticação. Não afirmar cobertura
uniforme: `/api-docs`, `/openapi.json` e `/health` são registrados antes das
camadas globais. CORS permite requisições sem Origin; não substitui autenticação,
firewall ou TLS. Limitadores não têm store distribuído explícito inspecionado.

O handler mascara 5xx em produção, mas logs podem conter detalhes internos e
`/health` devolve mensagem do driver em degradação. Swagger UI persiste autorização
no cliente; evitar uso em computador compartilhado. HTTPS/TLS e política de proxy
não são fornecidos pela mera existência dos Dockerfiles/Compose.

## Gestão de segredos

- Valores presentes em arquivos de ambiente rastreados e templates devem ser
  tratados como **públicos e impróprios para reutilização em produção**. Isso vale
  também para o antigo experimento de servidor de testes. Não copiar suas senhas.
- `.gitignore` não remove arquivos já rastreados nem apaga histórico. Auditar nomes
  e histórico sem imprimir valores; remoção/reescrita exige plano e autorização.
- Gerar `JWT_SECRET`, `REGISTER_TOKEN` e credenciais de banco exclusivos por
  ambiente, em canal local seguro. Recomenda-se ao menos 32 bytes aleatórios para
  os dois segredos de aplicação; o código não impõe essa entropia.
- Não inserir segredos em `VITE_*`: valores são públicos no JavaScript do build.
  `VITE_API_BASE_URL` é endereço público, não credencial. Não incluir senha na URL.
- Usar mecanismo de segredos apropriado à implantação; não afirmar que integração
  com secret manager já exista. Não versionar `.env` reais, logs, snapshots,
  descritores de processos ou coleções Postman preenchidas.
- Exportação de Postman deve limpar token, senhas, reset e registro de proveniência.
  A coleção versionada contém somente placeholders, valores vazios e exemplos
  sintéticos; sua execução real ainda não foi homologada.

Se houver exposição possível: conter acesso, rotacionar segredos/credenciais,
avaliar invalidação dos tokens, revisar logs e alcance temporal da exposição e
coordenar resposta com mantenedor. Remover o arquivo do último commit não revoga
credencial nem elimina cópias do histórico. Não executar correções sem autorização.

## Bancos e execução de ferramentas

Preservar os ambientes conhecidos: `qadb:5433`, `qa_control_test:5434`,
`qa_control_integration:5435` e ensaio histórico em 5436. Não executar migrations,
resets, TRUNCATE, limpeza ou testes destrutivos nesses destinos. Não iniciar/recriar
Compose como preparação automática; nomes/volumes fixos podem reutilizar dados.

Nova integração exige autorização e PostgreSQL novo/exclusivo com identidade real
verificada (socket, banco, usuário, cluster, volume e concordância de `DATABASE_URL`
e `DB_*`). Guardas atuais de integração fixam 5435; existência do runner não autoriza
reutilizar o destino preservado. Guardas são barreiras contra erro operacional,
não sandbox contra código arbitrário. Consultar [estado](backend/FEATURE-VALIDATION-STATUS.md),
[migrations](backend/MIGRATIONS.md) e [integração](backend/DISPOSABLE-INTEGRATION.md).

`npm test` backend carrega setup legado para 5434 e cobertura; não é comando seguro
para regressão indiscriminada. Preferir seleção isolada revisada, sem setup de
banco, conforme [guia de testes](docs/testes.md).

## Limitações conhecidas e preparação para implantação

O [roadmap](roadmap.md) centraliza BUG-001 a BUG-004, SEC-01 a SEC-04 e
PERF-01/PERF-02. Permanecem pendentes; testes de caracterização não aprovam o defeito.
A auditoria estática aceita no item 17 não encontrou vulnerabilidade crítica
comprovada no escopo inspecionado; não equivale a pentest ou segurança integrada.

Além dos achados frontend, avaliar concorrência de reset/bootstrap/finalização,
edição geral após finalização, filtros de excluídos, SQL de DDL em GET /stats,
auditoria parcial e exposição de health/logs. Consultas parametrizadas nos serviços
não comprovam ausência universal de injeção ou todos os controles de autorização.

Antes de implantação: fechar decisões de sessão/RBAC, verificar segredos inéditos,
TLS e origens, restringir portas/docs/health, rever privilégios DB, testar backup e
restauração e coordenar schema/código. A configuração de produção existente não
comprova essas garantias. Usar o [checklist de preparação](docs/preparacao-producao.md),
sem interpretá-lo como autorização de deploy.
