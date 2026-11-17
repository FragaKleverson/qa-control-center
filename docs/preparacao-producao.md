# Preparação para produção — checklist pendente

[README](../README.md) · [Segurança](../SECURITY.md) ·
[Instalação](instalacao.md) · [RNFs](requisitos/nao-funcionais.md)

**Não é um roteiro de deploy autorizado nem declaração de prontidão.** O código
contém artefatos de produção, mas não há implantação de produção homologada nesta
revisão. Checklist representa decisões/validações ainda necessárias; cada operação
exige plano e autorização próprios. Não marcar o roadmap automaticamente.

## Artefatos disponíveis e lacunas

| Artefato | Implementado | Validação/decisão ainda necessária |
|---|---|---|
| Backend Dockerfile | Node 22 Alpine, dependências de produção, usuário não root, health check | Pin/digest e versão efetiva; dependências diretas/transitivas; segurança da imagem |
| Frontend Dockerfile/Nginx | Build estático, SPA fallback e cache de assets | URL pública da API no build, TLS, headers, navegação real e cache de release |
| Compose produção | DB sem porta host, sem db-test, volume e reinício | Segredos, portas HTTP/TLS, backups, ownership e operação real |
| Prisma Migrate | Schema/histórico versionado | Aplicação controlada no destino correto; CLI/engine Linux compatíveis fora do runtime |
| Health | SELECT 1 e 200/503 | Exposição de erro interno, timeout, uso como readiness/liveness e observabilidade |

Dockerfile backend instala --omit=dev: Prisma CLI é devDependency. Copiar schema e
migrations à imagem não disponibiliza automaticamente CLI ou aplica histórico.
Imagens Alpine usam musl; o schema engine GNU/glibc do WSL não comprova compatibilidade
com elas. Conferir plataforma/OpenSSL/versão/digest antes de planejar migrations.

Compose local monta init SQL antigo; Compose produção não monta esses scripts nem
executa migrations automaticamente. Não importar dados por baseline presumido.

## Configuração de implantação

- [ ] Definir topologia, domínio, proxy/TLS, terminador HTTPS e política de acesso.
  Nginx versionado só serve SPA/assets; não possui proxy de API nem TLS configurado.
- [ ] Definir e verificar VITE_API_BASE_URL no build final, HTTPS e origem corretos,
  sem credenciais. Fallback localhost não é configuração de produção (SEC-04).
- [ ] Revisar como fornecer essa variável: Compose produção não declara build args
  para VITE_API_BASE_URL; exportá-la só no host/ambiente runtime do container não
  garante transmissão ao estágio docker build ou alteração do bundle existente.
  A solução depende de entrega técnica própria; não foi implementada aqui.
- [ ] Configurar NODE_ENV=production; nunca test. Conferir PORT, DB_* e DATABASE_URL
  sem fallback para destinos protegidos e sem registrar seus valores.
- [ ] Segredos inéditos, exclusivos e rotacionáveis; não reutilizar templates,
  arquivos públicos ou credenciais do servidor experimental. Secret manager e
  permissões de leitura ainda precisam de escolha/implementação conforme ambiente.
- [ ] Conferir ALLOWED_ORIGINS no backend/proxy, ausência de exposição de Postgres e
  restrição de docs/health conforme política. Só remover variável de porta não
  remove publicação do Compose local; usar configuração revisada.

## Segurança e consistência

- [ ] Definir política de sessão, duração, armazenamento, revogação e invalidação
  após alteração de papel/exclusão/reset; resolver ou aceitar formalmente SEC-01/02/03.
- [ ] Validar JWT/RBAC/401/403 com autenticação real, sem bypass de test nem confiar
  em botões ocultos. Definir necessidade de isolamento por equipe/tenant, hoje ausente.
- [ ] Controlar bootstrap Admin e entrega de recuperação de senha; não há SMTP
  implementado. Rever concorrência e consumo do reset; não expor _dev_token em produção.
- [ ] Tratar ou aceitar formalmente BUG-001 a BUG-004 e limites de finalização,
  atualização geral, soft delete e auditoria. Não promover caracterizações a correções.
- [ ] Revisar DDL em GET /stats, privilégio mínimo DB e retorno de zeros em erro;
  não presumir que o runtime já funcione com papel sem permissão de DDL.
- [ ] Revisar health/logs e redação de informações sensíveis; limitar persistência
  de autorização no Swagger, retenção de logs e exportações Postman.
- [ ] Revisar limitadores/proxy e necessidade de store compartilhado; existência de
  limiter local não comprova proteção de múltiplas réplicas ou toda composição HTTP.

## Dados, rollout e recuperação

- [ ] Destino de implantação explicitamente aprovado, schema/histórico inspecionados
  e DB_* / DATABASE_URL concordantes. Não usar 5433–5436 para ensaios/migrations.
- [ ] Backup recuperável e teste de restauração em instância exclusiva autorizada;
  definir retenção, criptografia, responsáveis e RTO/RPO, atualmente A DEFINIR.
- [ ] Ensaiar migrations com dados representativos novos, medir locks/tempo e
  coordenar janela/suspensão de escritores antigos. Ensaios sintéticos anteriores
  não comprovam todos os dados reais nem desempenho de ALTER TABLE em volume.
- [ ] Definir ordem schema/código e recuperação preservadora; migrate resolve não
  desfaz dados. Não remover coluna/tabela como rollback automático. Consultar
  [MIGRATIONS](../backend/MIGRATIONS.md) e [ensaio histórico](../backend/HISTORICAL-MIGRATION-REHEARSAL.md).
- [ ] Identificar recursos/volumes novos sem colidir com os preservados; definir
  aprovação específica para criação, execução e eventual remoção. Não reutilizar
  runner allowlist 5435 por conveniência.

## Qualidade e capacidade operacional

- [ ] Revalidar regressão, lint e build para o commit/código/configuração de release.
  O build histórico isolado sem .env não é pacote aprovado de implantação.
- [ ] Atingir os quatro pisos backend sem reduzir thresholds nem excluir arquivos
  adicionais; integração futura somente em alvo descartável novo autorizado.
- [ ] Planejar E2E real separado e segurança integrada; medições frontend estáticas
  não comprovam navegação, sessão, downloads ou desempenho em navegador real.
- [ ] Aprovar massa, cenários, carga, repetições e critérios de latência/recursos;
  todas as metas não estabelecidas seguem A DEFINIR. Respeitar adiamento de carga
  backend; qualquer retomada depende de decisão explícita.
- [ ] Avaliar coleções completas, N+1 de relatórios, geração DOCX integral e imports
  antecipados; medir antes de otimizar. Não usar tempo de build como métrica da UI.
- [ ] Definir monitoramento, alertas, correlação, retenção, disponibilidade, suporte
  e resposta a incidente. Docker health check não comprova operação monitorada.
- [ ] Definir navegadores/acessibilidade, CI/CD, quality gates e política de dependências.
  Esses objetivos futuros não estão concluídos por esta entrega documental.

Critério de prontidão deve ser aprovado pelo responsável com evidência por item,
ambiente/commit identificados e riscos residuais aceitos. Nenhum item deste guia
foi validado operacionalmente nesta revisão; não iniciar deploy a partir dele.
