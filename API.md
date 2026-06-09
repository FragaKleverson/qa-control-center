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

### Passo 1: Fazer Login

1. Clique em **`POST /auth/login`** (seção Autenticação)
2. Clique em **"Try it out"**
3. Cole dados de teste:
   ```json
   {
     "email": "usuario@empresa.com",
     "password": "SenhaForte@123"
   }
   ```
4. Clique em **"Execute"**

### Passo 2: Copiar Token

Na resposta, você verá:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

✅ **Copie o valor do campo `token`** (sem as aspas)

### Passo 3: Autorizar

1. Clique no botão verde **"Authorize"** (topo direito)
2. Cole o token
3. Clique em **"Authorize"**
4. Clique em **"Close"**

### Passo 4: Usar Endpoints

Agora teste qualquer endpoint (ex: `GET /projetos`):
- Clique em **"Try it out"**
- Clique em **"Execute"**

O token é enviado **automaticamente**! ✨

---

## 📦 Usar em Postman / Insomnia

### OpenAPI JSON (Recomendado)

**Importante:** `openapi.json` **substitui** a collection Postman.

**Por que?**
- ✅ 1 arquivo para todas ferramentas
- ✅ Sempre sincronizado
- ✅ Suporta Postman, Insomnia, VSCode, etc.

### Importar em Postman

```
1. Postman → Import
2. Arraste openapi.json
3. Collection criada automaticamente!
4. Teste como no Swagger UI
```

### Importar em Insomnia

```
1. Insomnia → Create → Import
2. Selecione openapi.json
3. Pronto!
```

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
