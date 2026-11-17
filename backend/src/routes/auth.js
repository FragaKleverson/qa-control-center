const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require("../validators/auth");
const { authLoginLimiter, authRegisterLimiter, passwordResetLimiter } = require("../middleware/rateLimiters");
const authMiddleware = require("../middleware/auth");
const config = require("../config/env");

// Middleware: verifica se o x-register-token está correto antes de validar o body
function requireRegisterToken(req, res, next) {
  const provided = req.headers["x-register-token"];
  if (!provided || provided !== config.registerToken) {
    return res.status(403).json({ error: "Token de registro inválido ou ausente" });
  }
  next();
}


// Ordem: 1) rate limit → 2) token check → 3) validação body → 4) handler
router.post("/register", authRegisterLimiter, requireRegisterToken, validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});


router.post("/login", authLoginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});


// authMiddleware aplicado inline para funcionar em qualquer NODE_ENV
router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    await authService.logout(req.user.jti, req.user.tokenExp);
    res.json({ message: "Logout realizado com sucesso." });
  } catch (err) {
    next(err);
  }
});


router.post("/forgot-password", passwordResetLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const rawToken = await authService.forgotPassword(req.body.email);

    // Resposta sempre igual para não vazar se o e-mail existe
    const response = { message: "Se o e-mail existir, você receberá um link de redefinição." };

    // Em dev/test: expõe o token para facilitar testes sem SMTP configurado
    if (!config.isProduction && rawToken) {
      response._dev_token = rawToken;
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});


router.post("/reset-password", validate(resetPasswordSchema), async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: "Senha redefinida com sucesso." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/auth/register": {
 *     "post": {
 *       "tags": [
 *         "Autenticação"
 *       ],
 *       "operationId": "post_auth_register",
 *       "summary": "Cadastrar usuário",
 *       "description": "Exige x-register-token, não Bearer. Primeiro usuário recebe admin; seguintes qa; papel enviado no body é descartado. Bootstrap por contagem não serializa concorrência. E-mail normalizado; bcrypt; duplicidade 409.",
 *       "security": [
 *         {
 *           "registerToken": []
 *         }
 *       ],
 *       "responses": {
 *         "201": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/PublicUser"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "$ref": "#/components/responses/Http400"
 *         },
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "409": {
 *           "$ref": "#/components/responses/Http409"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [],
 *       "x-business-rules": [
 *         "RN-001"
 *       ],
 *       "x-source": "backend/src/routes/auth.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/RegisterInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/auth/login": {
 *     "post": {
 *       "tags": [
 *         "Autenticação"
 *       ],
 *       "operationId": "post_auth_login",
 *       "summary": "Autenticar",
 *       "description": "Validator exige email válido e password não vazio; campos inválidos 422. Serviço lowercase/trim do e-mail e bcrypt.compare mesmo sem usuário; usuário inexistente/senha incorreta 401 genérico. Não aceita role do cliente; JTI único.",
 *       "security": [],
 *       "responses": {
 *         "200": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/LoginResponse"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "$ref": "#/components/responses/Http400"
 *         },
 *         "401": {
 *           "$ref": "#/components/responses/Http401"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [],
 *       "x-business-rules": [
 *         "RN-002",
 *         "RN-003"
 *       ],
 *       "x-source": "backend/src/routes/auth.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/LoginInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/auth/logout": {
 *     "post": {
 *       "tags": [
 *         "Autenticação"
 *       ],
 *       "operationId": "post_auth_logout",
 *       "summary": "Revogar token atual",
 *       "description": "Auth inline inclusive em test. Registra JTI/expiração, limpa revogações expiradas. Tokens legados sem JTI não são revogados. Botão frontend é somente local; não chama este endpoint.",
 *       "security": [
 *         {
 *           "bearerAuth": []
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/Message"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "$ref": "#/components/responses/Http400"
 *         },
 *         "401": {
 *           "$ref": "#/components/responses/Http401"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [
 *         "admin",
 *         "qa",
 *         "reader"
 *       ],
 *       "x-business-rules": [
 *         "RN-004"
 *       ],
 *       "x-source": "backend/src/routes/auth.js"
 *     }
 *   },
 *   "/auth/forgot-password": {
 *     "post": {
 *       "tags": [
 *         "Autenticação"
 *       ],
 *       "operationId": "post_auth_forgot_password",
 *       "summary": "Solicitar redefinição",
 *       "description": "Mensagem genérica; token bruto só fora de produção e com usuário existente. Hash SHA-256 e validade no banco; invalida tokens anteriores não usados. Envio de e-mail NÃO implementado.",
 *       "security": [],
 *       "responses": {
 *         "200": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/ForgotResponse"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "$ref": "#/components/responses/Http400"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [],
 *       "x-business-rules": [
 *         "RN-005"
 *       ],
 *       "x-source": "backend/src/routes/auth.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/ForgotInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/auth/reset-password": {
 *     "post": {
 *       "tags": [
 *         "Autenticação"
 *       ],
 *       "operationId": "post_auth_reset_password",
 *       "summary": "Redefinir senha",
 *       "description": "Token omitido/vazio e senha inválida: 422; token fornecido não encontrado/usado/expirado: 400. Atualiza hash da senha e uso do token sem transação abrangente; não revoga todos os JWTs anteriores.",
 *       "security": [],
 *       "responses": {
 *         "200": {
 *           "description": "Sucesso",
 *           "content": {
 *             "application/json": {
 *               "schema": {
 *                 "$ref": "#/components/schemas/Message"
 *               }
 *             }
 *           }
 *         },
 *         "400": {
 *           "$ref": "#/components/responses/Http400"
 *         },
 *         "413": {
 *           "$ref": "#/components/responses/Http413"
 *         },
 *         "422": {
 *           "$ref": "#/components/responses/Http422"
 *         },
 *         "429": {
 *           "$ref": "#/components/responses/Http429"
 *         },
 *         "500": {
 *           "$ref": "#/components/responses/Http500"
 *         }
 *       },
 *       "x-roles": [],
 *       "x-business-rules": [
 *         "RN-005"
 *       ],
 *       "x-source": "backend/src/routes/auth.js",
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/ResetInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
