# 📚 API QA Control Center

**Versão:** 1.0.0 | **Status:** ✅ Completa | **30+ endpoints**  
**Autenticação:** JWT Bearer Token | **Documentação:** Swagger UI + OpenAPI 3.0

---

## 🚀 COMEÇAR AGORA (Recomendado)

### Usar Swagger UI (Documentação Interativa)

```bash
# 1. Iniciar backend
cd backend
npm start

# 2. Abrir no navegador
http://localhost:3001/api-docs
```

**Por que Swagger UI?**
- ✅ Interface clicável
- ✅ Teste endpoints direto no browser
- ✅ Token persiste automaticamente
- ✅ Melhor experiência

---

## 🔐 Como Autenticar no Swagger UI

### ⚠️ Primeira Vez? REGISTER_TOKEN

1. Copie valor de **REGISTER_TOKEN** do seu `.env`
2. Vá para o endpoint **`POST /auth/register`**
3. No header `x-register-token`, cole o token

### Passo 1️⃣: Registrar Usuário

1. Clique em **`POST /auth/register`** (seção Autenticação)
2. Clique em **"Try it out"**
3. No **header** `x-register-token`, cole seu `REGISTER_TOKEN`
4. No **body**, preencha:
   ```json
   {
     "nome": "Seu Nome",
     "email": "seu@email.com",
     "password": "SenhaForte@123"
   }
   ```
5. Clique em **"Execute"**
6. ✅ Usuário criado!

### Passo 2️⃣: Fazer Login

1. Clique em **`POST /auth/login`** (seção Autenticação)
2. Clique em **"Try it out"**
3. Preencha com email/password que acabou de registrar:
   ```json
   {
     "email": "seu@email.com",
     "password": "SenhaForte@123"
   }
   ```
4. Clique em **"Execute"**

### Passo 3️⃣: Copiar JWT

Na resposta, você verá:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

✅ **Copie o valor do campo `token`** (sem as aspas)

### Passo 4️⃣: Autorizar no Swagger

1. Clique no botão verde **"Authorize"** (topo direito)
2. Cole apenas o **token JWT** (sem "Bearer")
3. Clique em **"Authorize"**
4. Clique em **"Close"**

### Passo 5️⃣: Usar Endpoints Protegidos

Agora teste qualquer endpoint (ex: `GET /projetos`):
- Clique em **"Try it out"**
- Clique em **"Execute"**

O JWT é enviado **automaticamente**! ✨

---

## 📦 Usar em Postman / Insomnia

### ✨ Nova Collection Postman (Automática!)

Temos uma **Collection pronta com automação**:

📄 **Arquivo:** `QA_Control_Center.postman_collection.json`

**O que tem de bom:**
- ✅ Todos endpoints pré-configurados
- ✅ Login **extrai JWT automaticamente**
- ✅ Todos endpoints protegidos usam JWT **automaticamente**
- ✅ Variáveis compartilhadas (baseUrl, jwt_token, register_token)
- ✅ Pronto para usar!

### Como Usar

1. **Importe a Collection:**
   - Abra **Postman** → **Import**
   - Selecione `QA_Control_Center.postman_collection.json`
   - ✅ Collection criada!

2. **Configure REGISTER_TOKEN:**
   - Clique em **Variables** (abas do topo)
   - Localize `register_token`
   - Na coluna **Current value**, cole seu `REGISTER_TOKEN` do `.env`

3. **Registre usuário:**
   - Vá em **Auth → 1️⃣ Register User**
   - Clique em **Send**
   - ✅ Usuário criado!

4. **Faça Login:**
   - Vá em **Auth → 2️⃣ Login**
   - Clique em **Send**
   - JWT é salvo **automaticamente** em `{{jwt_token}}`
   - ✅ Pronto!

5. **Teste endpoints:**
   - Clique em **Projetos → Listar Projetos**
   - Clique em **Send**
   - JWT é injetado **automaticamente**

### Automação do Login

O script Tests do Login faz tudo:

```javascript
const response = pm.response.json();

if (response.token) {
    pm.collectionVariables.set('jwt_token', response.token);
    console.log('✅ JWT salvo em {{jwt_token}}');
}
```

Agora é só clicar em **Send** e aproveitar! 🚀

### OpenAPI JSON (Alternativa)

Se preferir Insomnia/ThunderClient:
- Importe `openapi.json` na ferramenta
- Mesma funcionalidade

---

## 🔗 Endpoint de Autenticação

### POST /auth/login
Faz login e retorna JWT.

**Request:**
```json
{
  "email": "usuario@empresa.com",
  "password": "SenhaForte@123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nome": "Usuário",
    "email": "usuario@empresa.com"
  }
}
```

**Uso:** Cole o `token` em "Authorize" do Swagger UI.

---

## 🔗 Endpoints Principais

### Projetos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/projetos` | Listar todos |
| POST | `/projetos` | Criar novo |
| GET | `/projetos/:id` | Obter por ID |
| PUT | `/projetos/:id` | Atualizar |
| DELETE | `/projetos/:id` | Deletar |

### Test Suites

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/test-suites` | Listar |
| POST | `/test-suites` | Criar |
| GET | `/test-suites/:id/cases` | Listar casos |

### Execuções

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/execucoes` | Listar |
| POST | `/execucoes` | Criar |
| GET | `/execucoes/:id/results` | Obter resultados |
| PUT | `/execucoes/:id/results/:id` | Atualizar resultado |
| POST | `/execucoes/:id/finalize` | Finalizar |

### Relatórios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/relatorios` | Listar |
| POST | `/relatorios/generate` | Gerar JSON |
| POST | `/relatorios/export` | Exportar DOCX |

### Estatísticas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/stats` | Dashboard |

---

## 🧪 Testar com cURL

### Fazer Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"SenhaForte@123"}'
```

### Usar Token em Requisição

```bash
TOKEN="seu_token_aqui"

curl -X GET http://localhost:3001/projetos \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📄 Documentação Disponível

| Formato | Local | Uso |
|---------|-------|-----|
| **Swagger UI** | http://localhost:3001/api-docs | 🎯 Interativo (RECOMENDADO) |
| **OpenAPI JSON** | http://localhost:3001/openapi.json | 📦 Importar em ferramentas |
| **Este arquivo** | `API.md` | 📖 Referência rápida |

---

## ✅ Checklist de Setup

- [ ] Backend iniciado (`npm start`)
- [ ] Swagger UI acessível em `/api-docs`
- [ ] Fazer login com sucesso
- [ ] Copiar token
- [ ] Clicar em "Authorize"
- [ ] Testar endpoint (`GET /projetos`)
- [ ] ✨ Pronto!

---

## ❌ Troubleshooting

### "Swagger sem endpoints"
- Backend iniciou? `npm start`
- `/api-docs` carregou?
- Verifique logs do terminal

### "401 Unauthorized"
- Fez login?
- Token está correto?
- Clicou em "Authorize"?

### "Token inválido"
- Token expirou? Faça login novamente
- Copiar SEM as aspas

---

## 🔒 Segurança

- ✅ JWT Bearer Token (8 horas)
- ✅ HTTPS em produção
- ✅ Rate Limiting (200 req / 15 min)
- ✅ CORS configurado
- ✅ Helmet ativa headers de segurança

---

## 📞 Recursos

- GitHub: https://github.com/FragaKleverson/qa-control-center
- Swagger UI: http://localhost:3001/api-docs
- OpenAPI Spec: http://localhost:3001/openapi.json

---

**Última atualização:** 2026-06-09  
**Status:** ✅ Pronto para Usar
