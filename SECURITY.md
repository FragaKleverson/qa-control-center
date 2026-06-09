# 🔒 Políticas de Segurança

## Environment Variables

### ⚠️ Regras Críticas

1. **NUNCA commite arquivos `.env` com credenciais reais**
   - `.gitignore` já previne isso (`/backend/.env`, `/.env`, etc.)
   - Verifique sempre: `git status` deve mostrar `.env` como `ignored`

2. **Use `.env.example` como template**
   - Copie para `.env` e preencha seus valores localmente
   - Compartilhe `.env.example` no repositório (sem credenciais)

3. **Rotação de Credenciais**
   - Sempre que credenciais forem expostas, **regenere IMEDIATAMENTE**
   - Comando para gerar novos secrets:
     ```bash
     node -e "require('crypto').randomBytes(32).toString('hex')"
     ```

### 📋 Variáveis Sensíveis

| Variável | Tipo | Rotação | Documentação |
|----------|------|---------|--------------|
| `JWT_SECRET` | Segredo criptográfico | Sempre que exposto | [JWT Docs](#jwt-secret) |
| `REGISTER_TOKEN` | Token de Registro | Sempre que exposto | [Register Token](#register-token) |
| `DB_PASSWORD` | Senha do Banco | Antes do deploy em produção | [DB Setup](#database) |
| `POSTGRES_PASSWORD` | Senha PostgreSQL | Antes do deploy em produção | [Docker Compose](#docker-compose) |

### 🔑 JWT_SECRET

- **Tamanho mínimo:** 32 bytes (256 bits)
- **Geração:** `node -e "require('crypto').randomBytes(32).toString('hex')"`
- **Uso:** Assinatura e validação de tokens JWT
- **Expiração:** Defina em `JWT_EXPIRES_IN` (ex: 8h)

### 🎫 REGISTER_TOKEN

- **Tamanho mínimo:** 32 bytes (256 bits)
- **Geração:** `node -e "require('crypto').randomBytes(32).toString('hex')"`
- **Uso:** Proteção do endpoint `POST /auth/register`
- **Compartilhamento:** Apenas com pessoas que precisam criar contas
- **Header:** `x-register-token`

### 🗄️ DATABASE

- Sempre use senhas fortes (mínimo 16 caracteres, mix de tipos)
- Em produção, use secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
- Nunca reutilize senhas entre ambientes

### 🐳 DOCKER_COMPOSE

- Variáveis sensíveis devem vir do arquivo `.env`
- Nunca hardcode credenciais no docker-compose.yml
- Use `${VARIAVEL}` para referenciar do `.env`

## ✅ Checklist de Segurança

- [ ] `.env` está no `.gitignore`
- [ ] `.env` é diferente de `.env.example`
- [ ] `.env.example` contém apenas placeholders (`GERE_UM_VALOR_AQUI`)
- [ ] JWT_SECRET tem 32+ bytes
- [ ] REGISTER_TOKEN tem 32+ bytes
- [ ] Senhas do DB são fortes (16+ caracteres)
- [ ] Nenhum secret está hardcoded no código
- [ ] `npm install` não expõe variáveis de ambiente
- [ ] Logs em produção não exibem credenciais

## 🚨 Se Credenciais Forem Expostas

1. **IMEDIATAMENTE** rotacione as credenciais
2. Atualize `.env` localmente
3. Implante a nova versão
4. Revogar tokens antigos se possível
5. Verificar logs para acesso não autorizado

## 📚 Referências

- [OWASP - Secrets Management](https://owasp.org/www-community/Secrets_Management)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT.io](https://jwt.io/)
