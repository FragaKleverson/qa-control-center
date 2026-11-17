/**
 * Rotas de gestão de usuários — acesso exclusivo para role 'admin'.
 *
 * GET    /admin/usuarios          — lista todos os usuários
 * PATCH  /admin/usuarios/:id/role — altera o role de um usuário
 * DELETE /admin/usuarios/:id      — remove um usuário
 */

const express = require("express");
const router = express.Router();
const { z } = require("zod");
const authService = require("../services/authService");
const { listAuditLogs } = require("../services/auditService");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { idParamSchema } = require("../validators/common");

const changeRoleSchema = z.object({
  role: z.enum(["admin", "qa", "reader"], {
    errorMap: () => ({ message: "Role inválido. Valores aceitos: admin, qa, reader" }),
  }),
});

// Todas as rotas aqui exigem role 'admin'
router.use(authorize("admin"));


router.get("/usuarios", async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});


router.patch(
  "/usuarios/:id/role",
  validate(idParamSchema, "params"),
  validate(changeRoleSchema),
  async (req, res, next) => {
    try {
      const user = await authService.changeUserRole(
        req.params.id,
        req.user.id,
        req.body.role
      );
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);


router.delete(
  "/usuarios/:id",
  validate(idParamSchema, "params"),
  async (req, res, next) => {
    try {
      await authService.deleteUser(req.params.id, req.user.id);
      res.json({ message: "Usuário removido com sucesso." });
    } catch (err) {
      next(err);
    }
  }
);


router.get("/audit-log", async (req, res, next) => {
  try {
    const { entity_type, entity_id, user_id, action, from, to, page, limit } = req.query;
    const result = await listAuditLogs({ entityType: entity_type, entityId: entity_id, userId: user_id, action, from, to, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
/**
 * @openapi
 * {
 *   "/admin/usuarios": {
 *     "get": {
 *       "tags": [
 *         "Administração"
 *       ],
 *       "operationId": "get_admin_usuarios",
 *       "summary": "Listar usuários públicos",
 *       "description": "Admin-only; ordenado por id; sem hash de senha, sem paginação.",
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
 *                 "type": "array",
 *                 "items": {
 *                   "$ref": "#/components/schemas/PublicUser"
 *                 }
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
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
 *         "admin"
 *       ],
 *       "x-business-rules": [
 *         "RN-006"
 *       ],
 *       "x-source": "backend/src/routes/admin.js"
 *     }
 *   },
 *   "/admin/usuarios/{id}/role": {
 *     "patch": {
 *       "tags": [
 *         "Administração"
 *       ],
 *       "operationId": "patch_admin_usuarios_id_role",
 *       "summary": "Alterar papel de usuário",
 *       "description": "Não altera o próprio papel (403); alvo ausente 404; role fora do enum 422 na rota. Não revoga automaticamente JWTs emitidos anteriormente.",
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
 *                 "$ref": "#/components/schemas/PublicUser"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
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
 *       "x-roles": [
 *         "admin"
 *       ],
 *       "x-business-rules": [
 *         "RN-003",
 *         "RN-006"
 *       ],
 *       "x-source": "backend/src/routes/admin.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ],
 *       "requestBody": {
 *         "required": true,
 *         "description": "Objeto JSON; campos desconhecidos são descartados quando há validator Zod.",
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "$ref": "#/components/schemas/RoleInput"
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/admin/usuarios/{id}": {
 *     "delete": {
 *       "tags": [
 *         "Administração"
 *       ],
 *       "operationId": "delete_admin_usuarios_id",
 *       "summary": "Excluir usuário",
 *       "description": "Exclusão física sujeita às FKs; própria conta 403, ausente 404. Não é soft delete.",
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
 *         },
 *         "404": {
 *           "$ref": "#/components/responses/Http404"
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
 *       "x-roles": [
 *         "admin"
 *       ],
 *       "x-business-rules": [
 *         "RN-006",
 *         "RN-015"
 *       ],
 *       "x-source": "backend/src/routes/admin.js",
 *       "parameters": [
 *         {
 *           "$ref": "#/components/parameters/LegacyId"
 *         }
 *       ]
 *     }
 *   },
 *   "/admin/audit-log": {
 *     "get": {
 *       "tags": [
 *         "Administração"
 *       ],
 *       "operationId": "get_admin_audit_log",
 *       "summary": "Consultar auditoria",
 *       "description": "Eventos existentes com snapshots e contexto. Não cobre toda mutação; auditoria legada best-effort, catálogo transacional. Paginação própria sem validação comum; entrada inválida pode gerar erro de driver.",
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
 *                 "$ref": "#/components/schemas/AuditPage"
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
 *         "403": {
 *           "$ref": "#/components/responses/Http403"
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
 *         "admin"
 *       ],
 *       "x-business-rules": [
 *         "RN-016",
 *         "RN-018"
 *       ],
 *       "x-source": "backend/src/routes/admin.js",
 *       "parameters": [
 *         {
 *           "name": "entity_type",
 *           "in": "query",
 *           "required": false,
 *           "description": "Filtro literal, incluindo project (catálogo) e projeto (caso legado); não possui enum Zod.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         },
 *         {
 *           "name": "entity_id",
 *           "in": "query",
 *           "required": false,
 *           "description": "parseInt no serviço; sem schema Zod de ID.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         },
 *         {
 *           "name": "user_id",
 *           "in": "query",
 *           "required": false,
 *           "description": "parseInt no serviço.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         },
 *         {
 *           "name": "action",
 *           "in": "query",
 *           "required": false,
 *           "description": "Serviço converte para maiúsculas; CREATE/UPDATE/DELETE/RESTORE nos eventos instrumentados; sem enum na rota.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         },
 *         {
 *           "name": "from",
 *           "in": "query",
 *           "required": false,
 *           "description": "Limite inicial inclusivo, enviado ao PostgreSQL; sem validação de formato na rota.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         },
 *         {
 *           "name": "to",
 *           "in": "query",
 *           "required": false,
 *           "description": "Limite final inclusivo; sem expansão automática para fim do dia.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         },
 *         {
 *           "name": "page",
 *           "in": "query",
 *           "required": false,
 *           "description": "Default 1; parseInt; não possui a validação comum de paginação.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         },
 *         {
 *           "name": "limit",
 *           "in": "query",
 *           "required": false,
 *           "description": "Default 20; parseInt; sem limite máximo comum de 100.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         }
 *       ]
 *     }
 *   }
 * }
 */
