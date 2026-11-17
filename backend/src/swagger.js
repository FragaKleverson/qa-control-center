// Fonte canônica: componentes abaixo + anotações @openapi dos routers.
// openapi.json da raiz é exportação derivada; nunca importar app/env/db para gerá-lo.
const swaggerJsDoc = require("swagger-jsdoc");
const path = require("path");

const definition = {
  "openapi": "3.0.0",
  "info": {
    "title": "QA Control Center API",
    "version": "1.0.0",
    "description": "Contrato HTTP implementado. /projects é catálogo independente; /projetos são casos legados. Perfis admin/qa/reader; NODE_ENV=test injeta identidade em rotas de negócio e não representa composição segura de implantação. Análise documental não é homologação. Regras RN-* remetem a docs/regras-de-negocio.md. Erros 5xx não garantem rollback; constraints dependem do schema efetivamente aplicado.",
    "contact": {
      "name": "QA Team",
      "url": "https://github.com/FragaKleverson/qa-control-center"
    }
  },
  "servers": [
    {
      "url": "http://localhost:3001",
      "description": "Desenvolvimento local; ajuste à implantação autorizada. Não representa produção disponível."
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "tags": [
    {
      "name": "Autenticação"
    },
    {
      "name": "Administração"
    },
    {
      "name": "Projects"
    },
    {
      "name": "Test Cases (legado)"
    },
    {
      "name": "Requirements"
    },
    {
      "name": "Test Suites"
    },
    {
      "name": "Test Plans"
    },
    {
      "name": "Execuções"
    },
    {
      "name": "Relatórios"
    },
    {
      "name": "Dashboard"
    },
    {
      "name": "Saúde"
    },
    {
      "name": "Documentação"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT de login; expiração configurada; blocklist consultada quando há JTI. Papel no token pode ficar desatualizado."
      },
      "registerToken": {
        "type": "apiKey",
        "in": "header",
        "name": "x-register-token",
        "description": "Token configurado de cadastro; não é JWT nem convite individual."
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string"
          },
          "detalhes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "campo": {
                  "type": "string"
                },
                "mensagem": {
                  "type": "string"
                }
              },
              "required": [
                "campo",
                "mensagem"
              ]
            }
          }
        },
        "required": [
          "error"
        ],
        "description": "Erros comuns. detalhes aparece nas rejeições Zod; respostas de serviço/driver normalmente contêm apenas error."
      },
      "Message": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string"
          }
        },
        "required": [
          "message"
        ]
      },
      "Environment": {
        "type": "string",
        "enum": [
          "staging",
          "production",
          "development",
          "homologação"
        ]
      },
      "ExecutionStatus": {
        "type": "string",
        "enum": [
          "pending",
          "in_progress",
          "running",
          "passed",
          "failed",
          "blocked",
          "completed",
          "skipped"
        ]
      },
      "JsonValue": {
        "description": "Qualquer valor JSON: objeto, array, string, número finito, booleano ou null; sem shape obrigatório de cenário. Omitido no PUT preserva o valor."
      },
      "CoercedPositiveId": {
        "description": "Entrada convertida por Number() do z.coerce.number(); resultado deve ser inteiro positivo. Strings numéricas e outros valores coercíveis podem ser aceitos (por exemplo true vira 1). Não confundir com project_id estrito do caso.",
        "x-normalized-schema": {
          "type": "integer",
          "minimum": 1
        }
      },
      "SqlCount": {
        "oneOf": [
          {
            "type": "integer",
            "nullable": true
          },
          {
            "type": "string",
            "pattern": "^-?[0-9]+$"
          }
        ],
        "description": "COUNT/SUM bruto do driver pg pode ser string decimal; SUM sem linhas pode ser null."
      },
      "PublicUser": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "name": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "role": {
            "type": "string",
            "enum": [
              "admin",
              "qa",
              "reader"
            ]
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          }
        },
        "description": "Campos públicos: login/changeRole não incluem created_at; listagem/cadastro incluem. Sem password_hash."
      },
      "LoginResponse": {
        "type": "object",
        "properties": {
          "token": {
            "type": "string",
            "description": "JWT com sub/email/name/role/jti e expiração configurada."
          },
          "user": {
            "$ref": "#/components/schemas/PublicUser"
          }
        },
        "required": [
          "token",
          "user"
        ]
      },
      "Project": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          },
          "deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "created_by": {
            "type": "integer",
            "nullable": true
          },
          "nome": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "nullable": true
          }
        },
        "description": "Catálogo independente projects. Não é o caso legado de /projetos."
      },
      "TestCase": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          },
          "deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "created_by": {
            "type": "integer",
            "nullable": true
          },
          "titulo": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "nullable": true
          },
          "feature": {
            "type": "string",
            "nullable": true
          },
          "cenarios": {
            "$ref": "#/components/schemas/JsonValue"
          },
          "project_id": {
            "type": "integer",
            "nullable": true
          },
          "project_nome": {
            "type": "string",
            "nullable": true
          },
          "project_deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          }
        },
        "description": "Registro legado projetos. project_nome/project_deleted_at são enriquecimento dos GET /projetos; outras respostas SELECT */RETURNING * podem omiti-los. Nome do Project é atual, não snapshot."
      },
      "Requirement": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          },
          "deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "created_by": {
            "type": "integer",
            "nullable": true
          },
          "titulo": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "nullable": true
          },
          "status": {
            "type": "string",
            "description": "Domínio de novas escritas: Open, In Progress, Closed, Blocked."
          },
          "prioridade": {
            "type": "string",
            "description": "Low, Medium, High, Critical."
          }
        },
        "description": "Sem vínculo implementado com Projects ou Test Cases."
      },
      "TestSuite": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          },
          "deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "created_by": {
            "type": "integer",
            "nullable": true
          },
          "nome": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "nullable": true
          },
          "projeto_id": {
            "type": "integer",
            "description": "FK legada para projetos.id, não projects.id.",
            "nullable": true
          },
          "total_cases": {
            "$ref": "#/components/schemas/SqlCount"
          }
        },
        "description": "total_cases aparece na consulta de suítes de plano; não é calculado por toda listagem de suítes."
      },
      "TestPlan": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          },
          "deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "titulo": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "nullable": true
          },
          "escopo": {
            "type": "string",
            "nullable": true
          },
          "objetivo": {
            "type": "string",
            "nullable": true
          },
          "ambiente": {
            "type": "string",
            "nullable": true
          },
          "executed_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "legacy_classification": {
            "type": "string",
            "enum": [
              "eligible",
              "review_required",
              "executed"
            ]
          },
          "execution_id": {
            "type": "integer",
            "nullable": true
          },
          "execution_deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          }
        },
        "description": "Campos execution_id/execution_deleted_at são enriquecidos no GET/listagem; não em todo RETURNING *. Não há created_by no INSERT do serviço de planos."
      },
      "Execution": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          },
          "deleted_at": {
            "type": "string",
            "format": "date-time",
            "nullable": true
          },
          "created_by": {
            "type": "integer",
            "nullable": true
          },
          "plan_id": {
            "type": "integer",
            "nullable": true
          },
          "suite_id": {
            "type": "integer",
            "nullable": true
          },
          "ambiente": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "description": "Valores novos validados por ExecutionStatus; registros históricos não são normalizados aqui."
          },
          "resultado": {
            "type": "string",
            "nullable": true
          },
          "finalized": {
            "type": "boolean"
          },
          "nome_suite": {
            "type": "string",
            "nullable": true
          },
          "projeto_id": {
            "type": "integer",
            "nullable": true
          },
          "nome_projeto": {
            "type": "string",
            "nullable": true
          },
          "total_cases": {
            "$ref": "#/components/schemas/SqlCount"
          },
          "passed_cases": {
            "$ref": "#/components/schemas/SqlCount"
          },
          "failed_cases": {
            "$ref": "#/components/schemas/SqlCount"
          },
          "blocked_cases": {
            "$ref": "#/components/schemas/SqlCount"
          },
          "skipped_cases": {
            "$ref": "#/components/schemas/SqlCount"
          },
          "pending_cases": {
            "$ref": "#/components/schemas/SqlCount"
          }
        },
        "description": "Campos agregados/nome_suite/projeto_id/nome_projeto aparecem na listagem; outras operações retornam a linha persistida. projeto_id é da suíte legada, não o Project opcional do caso."
      },
      "ExecutionResult": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "updated_at": {
            "type": "string",
            "format": "date-time"
          },
          "execucao_id": {
            "type": "integer"
          },
          "projeto_id": {
            "type": "integer"
          },
          "status": {
            "type": "string"
          },
          "comentario": {
            "type": "string",
            "nullable": true
          },
          "titulo": {
            "type": "string"
          },
          "descricao": {
            "type": "string",
            "nullable": true
          },
          "feature": {
            "type": "string",
            "nullable": true
          },
          "cenarios": {
            "$ref": "#/components/schemas/JsonValue"
          }
        },
        "description": "execution_results não possui deleted_at. GET results adiciona título/descrição/feature/cenarios atuais do caso; PUT retorna somente a linha do resultado."
      },
      "SuiteCaseLink": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "suite_id": {
            "type": "integer"
          },
          "projeto_id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "suite_id",
          "projeto_id"
        ],
        "description": "ON CONFLICT pode retornar apenas suite_id/projeto_id quando vínculo já existe."
      },
      "PlanSuiteLink": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "plan_id": {
            "type": "integer"
          },
          "suite_id": {
            "type": "integer"
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "plan_id",
          "suite_id"
        ],
        "description": "ON CONFLICT pode retornar apenas plan_id/suite_id."
      },
      "ProjectPage": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Project"
            }
          },
          "total": {
            "type": "integer"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          }
        },
        "required": [
          "data",
          "total",
          "page",
          "limit"
        ]
      },
      "ProjectList": {
        "oneOf": [
          {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Project"
            }
          },
          {
            "$ref": "#/components/schemas/ProjectPage"
          }
        ],
        "description": "Sem page/limit: array; com qualquer um: envelope. Defaults page=1/limit=20; limite máximo 100."
      },
      "TestCasePage": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TestCase"
            }
          },
          "total": {
            "type": "integer"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          }
        },
        "required": [
          "data",
          "total",
          "page",
          "limit"
        ]
      },
      "TestCaseList": {
        "oneOf": [
          {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TestCase"
            }
          },
          {
            "$ref": "#/components/schemas/TestCasePage"
          }
        ],
        "description": "Sem page/limit: array; com qualquer um: envelope. Defaults page=1/limit=20; limite máximo 100."
      },
      "RequirementPage": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Requirement"
            }
          },
          "total": {
            "type": "integer"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          }
        },
        "required": [
          "data",
          "total",
          "page",
          "limit"
        ]
      },
      "RequirementList": {
        "oneOf": [
          {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Requirement"
            }
          },
          {
            "$ref": "#/components/schemas/RequirementPage"
          }
        ],
        "description": "Sem page/limit: array; com qualquer um: envelope. Defaults page=1/limit=20; limite máximo 100."
      },
      "TestSuitePage": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TestSuite"
            }
          },
          "total": {
            "type": "integer"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          }
        },
        "required": [
          "data",
          "total",
          "page",
          "limit"
        ]
      },
      "TestSuiteList": {
        "oneOf": [
          {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TestSuite"
            }
          },
          {
            "$ref": "#/components/schemas/TestSuitePage"
          }
        ],
        "description": "Sem page/limit: array; com qualquer um: envelope. Defaults page=1/limit=20; limite máximo 100."
      },
      "TestPlanPage": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TestPlan"
            }
          },
          "total": {
            "type": "integer"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          }
        },
        "required": [
          "data",
          "total",
          "page",
          "limit"
        ]
      },
      "TestPlanList": {
        "oneOf": [
          {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TestPlan"
            }
          },
          {
            "$ref": "#/components/schemas/TestPlanPage"
          }
        ],
        "description": "Sem page/limit: array; com qualquer um: envelope. Defaults page=1/limit=20; limite máximo 100."
      },
      "ExecutionPage": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Execution"
            }
          },
          "total": {
            "type": "integer"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          }
        },
        "required": [
          "data",
          "total",
          "page",
          "limit"
        ]
      },
      "ExecutionList": {
        "oneOf": [
          {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Execution"
            }
          },
          {
            "$ref": "#/components/schemas/ExecutionPage"
          }
        ],
        "description": "Sem page/limit: array; com qualquer um: envelope. Defaults page=1/limit=20; limite máximo 100."
      },
      "CaseTotals": {
        "type": "object",
        "properties": {
          "total": {
            "type": "integer"
          },
          "passed": {
            "type": "integer"
          },
          "failed": {
            "type": "integer"
          },
          "pending": {
            "type": "integer"
          },
          "blocked": {
            "type": "integer"
          },
          "skipped": {
            "type": "integer"
          }
        },
        "required": [
          "total",
          "passed",
          "failed",
          "pending",
          "blocked",
          "skipped"
        ]
      },
      "ExecutionStats": {
        "type": "object",
        "properties": {
          "total": {
            "type": "integer"
          },
          "passed": {
            "type": "integer"
          },
          "failed": {
            "type": "integer"
          },
          "pending": {
            "type": "integer"
          },
          "blocked": {
            "type": "integer"
          },
          "skipped": {
            "type": "integer"
          },
          "totalExecutions": {
            "type": "integer"
          },
          "finalizedExecutions": {
            "type": "integer"
          }
        },
        "description": "Contagens normalizadas para números; não filtram uniformemente registros soft-deletados."
      },
      "ReportCase": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "status": {
            "type": "string"
          },
          "comentario": {
            "type": "string",
            "nullable": true
          },
          "projeto_id": {
            "type": "integer"
          },
          "titulo": {
            "type": "string"
          }
        }
      },
      "ReportExecution": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Execution"
          },
          {
            "type": "object",
            "properties": {
              "testCases": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReportCase"
                }
              }
            },
            "required": [
              "testCases"
            ]
          }
        ]
      },
      "GeneratedReport": {
        "type": "object",
        "properties": {
          "summary": {
            "type": "object",
            "properties": {
              "total": {
                "type": "integer"
              },
              "passed": {
                "type": "integer"
              },
              "failed": {
                "type": "integer"
              },
              "pending": {
                "type": "integer"
              },
              "successRate": {
                "type": "number",
                "description": "Passed/total de execuções, arredondado a uma casa; zero quando vazio."
              },
              "testCases": {
                "$ref": "#/components/schemas/CaseTotals"
              }
            },
            "required": [
              "total",
              "passed",
              "failed",
              "pending",
              "successRate",
              "testCases"
            ]
          },
          "executions": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ReportExecution"
            }
          }
        },
        "required": [
          "summary",
          "executions"
        ]
      },
      "ReportsHistory": {
        "type": "object",
        "properties": {
          "executions": {
            "$ref": "#/components/schemas/ExecutionList"
          },
          "stats": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "status": {
                  "type": "string"
                },
                "count": {
                  "$ref": "#/components/schemas/SqlCount"
                }
              }
            }
          },
          "suiteStats": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "suite_id": {
                  "type": "integer"
                },
                "nome": {
                  "type": "string"
                },
                "total": {
                  "$ref": "#/components/schemas/SqlCount"
                },
                "passed": {
                  "$ref": "#/components/schemas/SqlCount"
                },
                "failed": {
                  "$ref": "#/components/schemas/SqlCount"
                },
                "blocked": {
                  "$ref": "#/components/schemas/SqlCount"
                },
                "skipped": {
                  "$ref": "#/components/schemas/SqlCount"
                },
                "pending": {
                  "$ref": "#/components/schemas/SqlCount"
                }
              }
            }
          }
        },
        "required": [
          "executions",
          "stats",
          "suiteStats"
        ],
        "description": "Somente executions é paginado; stats/suiteStats são globais. Sem paginação: executions contém até 100 registros. Inclui histórico sem filtro uniforme de deleted_at."
      },
      "Dashboard": {
        "type": "object",
        "properties": {
          "stats": {
            "type": "object",
            "properties": {
              "totalProjects": {
                "type": "integer",
                "description": "Conta casos legados de projetos, não catálogo projects."
              },
              "totalExecutions": {
                "type": "integer"
              },
              "testCases": {
                "$ref": "#/components/schemas/CaseTotals"
              }
            }
          },
          "recentProjects": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TestCase"
            }
          },
          "recentExecutions": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Execution"
            }
          }
        },
        "required": [
          "stats",
          "recentProjects",
          "recentExecutions"
        ],
        "description": "Em erro, serviço devolve zeros/arrays vazios e rota mantém HTTP 200; consulta executa DDL preexistente."
      },
      "Health": {
        "type": "object",
        "properties": {
          "healthy": {
            "type": "boolean"
          },
          "status": {
            "type": "string",
            "enum": [
              "ok",
              "degraded"
            ]
          },
          "uptime": {
            "type": "number"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "responseTimeMs": {
            "type": "number"
          },
          "database": {
            "type": "object",
            "properties": {
              "status": {
                "type": "string",
                "enum": [
                  "up",
                  "down"
                ]
              },
              "error": {
                "type": "string",
                "description": "Mensagem interna atual do driver em falha; limitação de segurança conhecida."
              }
            },
            "required": [
              "status"
            ]
          }
        },
        "required": [
          "healthy",
          "status",
          "uptime",
          "timestamp",
          "responseTimeMs",
          "database"
        ]
      },
      "AuditEvent": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "user_id": {
            "type": "integer",
            "nullable": true
          },
          "entity_type": {
            "type": "string"
          },
          "entity_id": {
            "type": "integer",
            "nullable": true
          },
          "action": {
            "type": "string"
          },
          "old_values": {
            "$ref": "#/components/schemas/JsonValue"
          },
          "new_values": {
            "$ref": "#/components/schemas/JsonValue"
          },
          "ip_address": {
            "type": "string",
            "nullable": true
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          },
          "user_name": {
            "type": "string",
            "nullable": true
          },
          "user_email": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "AuditPage": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/AuditEvent"
            }
          },
          "total": {
            "type": "integer"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          }
        },
        "required": [
          "data",
          "total",
          "page",
          "limit"
        ]
      },
      "RegisterInput": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 2,
            "maxLength": 255,
            "description": "Trim antes de validar comprimento."
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "password": {
            "type": "string",
            "minLength": 8,
            "maxLength": 128,
            "writeOnly": true
          }
        },
        "required": [
          "name",
          "email",
          "password"
        ]
      },
      "LoginInput": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string",
            "format": "email"
          },
          "password": {
            "type": "string",
            "minLength": 1,
            "writeOnly": true
          }
        },
        "required": [
          "email",
          "password"
        ]
      },
      "ForgotInput": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string",
            "format": "email"
          }
        },
        "required": [
          "email"
        ]
      },
      "ResetInput": {
        "type": "object",
        "properties": {
          "token": {
            "type": "string",
            "minLength": 1,
            "writeOnly": true
          },
          "password": {
            "type": "string",
            "minLength": 8,
            "maxLength": 128,
            "writeOnly": true
          }
        },
        "required": [
          "token",
          "password"
        ]
      },
      "ForgotResponse": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string"
          },
          "_dev_token": {
            "type": "string",
            "description": "Somente fora de produção, quando e-mail existe; não há envio SMTP implementado."
          }
        },
        "required": [
          "message"
        ]
      },
      "ProjectCreate": {
        "type": "object",
        "properties": {
          "nome": {
            "type": "string",
            "minLength": 1,
            "description": "Trim; não vazio."
          },
          "descricao": {
            "type": "string",
            "nullable": true
          }
        },
        "required": [
          "nome"
        ]
      },
      "ProjectUpdate": {
        "type": "object",
        "properties": {
          "nome": {
            "type": "string",
            "minLength": 1,
            "description": "Trim; não vazio."
          },
          "descricao": {
            "type": "string",
            "nullable": true
          }
        },
        "description": "PUT parcial; pelo menos nome ou descricao deve estar presente. Omitido preserva; descricao:null limpa; campos geridos pelo servidor são descartados.",
        "minProperties": 1,
        "anyOf": [
          {
            "required": [
              "nome"
            ]
          },
          {
            "required": [
              "descricao"
            ]
          }
        ]
      },
      "TestCaseCreate": {
        "type": "object",
        "properties": {
          "titulo": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string",
            "minLength": 1,
            "description": "Trim na criação."
          },
          "feature": {
            "type": "string",
            "minLength": 1,
            "description": "Trim na criação."
          },
          "cenarios": {
            "$ref": "#/components/schemas/JsonValue"
          },
          "project_id": {
            "type": "integer",
            "minimum": 1,
            "maximum": 2147483647,
            "description": "Número estrito, sem coerção; pai ativo. Omissão cria sem vínculo.",
            "nullable": true
          }
        },
        "required": [
          "titulo",
          "descricao",
          "feature"
        ]
      },
      "TestCaseUpdate": {
        "type": "object",
        "properties": {
          "titulo": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string"
          },
          "feature": {
            "type": "string"
          },
          "cenarios": {
            "$ref": "#/components/schemas/JsonValue"
          },
          "project_id": {
            "type": "integer",
            "minimum": 1,
            "maximum": 2147483647,
            "description": "Omitido preserva; null remove; número estrito vincula pai ativo.",
            "nullable": true
          }
        },
        "description": "Campos omitidos preservados, incluindo cenarios. JSON null grava JSON null. Sem versionamento geral de edição concorrente."
      },
      "RequirementCreate": {
        "type": "object",
        "properties": {
          "titulo": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string",
            "default": ""
          },
          "status": {
            "type": "string",
            "enum": [
              "Open",
              "In Progress",
              "Closed",
              "Blocked"
            ],
            "default": "Open"
          },
          "prioridade": {
            "type": "string",
            "enum": [
              "Low",
              "Medium",
              "High",
              "Critical"
            ],
            "default": "Medium"
          }
        },
        "required": [
          "titulo"
        ]
      },
      "RequirementUpdate": {
        "type": "object",
        "properties": {
          "titulo": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": [
              "Open",
              "In Progress",
              "Closed",
              "Blocked"
            ]
          },
          "prioridade": {
            "type": "string",
            "enum": [
              "Low",
              "Medium",
              "High",
              "Critical"
            ]
          }
        },
        "description": "PUT parcial; serviço usa COALESCE e valores falsy, portanto string vazia não limpa descrição."
      },
      "CoercedNullableId": {
        "description": "null ou entrada coercível por Number() para inteiro positivo; omissão permitida no campo. Usado por projeto_id legado de suíte."
      },
      "TestSuiteCreate": {
        "type": "object",
        "properties": {
          "nome": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string",
            "default": ""
          },
          "projeto_id": {
            "$ref": "#/components/schemas/CoercedNullableId"
          }
        },
        "required": [
          "nome"
        ]
      },
      "TestSuiteUpdate": {
        "type": "object",
        "properties": {
          "nome": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string"
          },
          "projeto_id": {
            "$ref": "#/components/schemas/CoercedNullableId"
          }
        },
        "description": "PUT parcial; COALESCE/valores falsy não removem projeto_id por null e não limpam texto vazio."
      },
      "TestPlanCreate": {
        "type": "object",
        "properties": {
          "titulo": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string",
            "default": ""
          },
          "escopo": {
            "type": "string",
            "default": ""
          },
          "objetivo": {
            "type": "string",
            "default": ""
          },
          "ambiente": {
            "$ref": "#/components/schemas/Environment"
          }
        },
        "required": [
          "titulo",
          "ambiente"
        ]
      },
      "TestPlanUpdate": {
        "type": "object",
        "properties": {
          "titulo": {
            "type": "string",
            "minLength": 1,
            "description": "Trim."
          },
          "descricao": {
            "type": "string"
          },
          "escopo": {
            "type": "string"
          },
          "objetivo": {
            "type": "string"
          },
          "ambiente": {
            "$ref": "#/components/schemas/Environment"
          }
        },
        "description": "PUT parcial somente de plano eligible e não executado; classificação/executed_at não são editáveis pelo cliente."
      },
      "ExecutePlanInput": {
        "type": "object",
        "properties": {},
        "description": "Body objeto validado por z.object({}); campos antigos, inclusive ambiente, são descartados. Ambiente vem do plano."
      },
      "ExecutionCreate": {
        "type": "object",
        "properties": {
          "suite_id": {
            "$ref": "#/components/schemas/CoercedPositiveId"
          },
          "ambiente": {
            "type": "string",
            "enum": [
              "staging",
              "production",
              "development",
              "homologação"
            ],
            "default": "staging"
          },
          "status": {
            "type": "string",
            "enum": [
              "pending",
              "in_progress",
              "running",
              "passed",
              "failed",
              "blocked",
              "completed",
              "skipped"
            ],
            "default": "pending"
          },
          "resultado": {
            "type": "string",
            "nullable": true
          }
        },
        "required": [
          "suite_id"
        ]
      },
      "ExecutionUpdate": {
        "type": "object",
        "properties": {
          "status": {
            "$ref": "#/components/schemas/ExecutionStatus"
          },
          "resultado": {
            "type": "string",
            "nullable": true
          }
        },
        "description": "PUT parcial; serviço não verifica finalized e usa COALESCE/valores falsy em resultado."
      },
      "ResultUpdate": {
        "type": "object",
        "properties": {
          "status": {
            "$ref": "#/components/schemas/ExecutionStatus"
          },
          "comentario": {
            "type": "string",
            "maxLength": 2000,
            "nullable": true
          }
        },
        "required": [
          "status"
        ],
        "description": "Omitir comentário no serviço pode limpá-lo; sucesso também marca execução running. Não altera apenas um rascunho."
      },
      "ReportFilters": {
        "type": "object",
        "properties": {
          "startDate": {
            "type": "string",
            "description": "Valor truthy parametrizado com cast ::date no PostgreSQL; sem schema Zod específico."
          },
          "endDate": {
            "type": "string",
            "description": "Inclusiva: consulta usa < dia seguinte; cast ::date."
          },
          "suite_id": {
            "description": "Valor truthy parametrizado para suite_id; rota não impõe tipo/positividade por Zod."
          }
        },
        "description": "Campos suportados pelo serviço; outros ignorados. Sem validação de intervalo/tipos na rota; dados inválidos podem gerar erro de driver/500, não prometer 422 uniforme."
      },
      "RoleInput": {
        "type": "object",
        "properties": {
          "role": {
            "type": "string",
            "enum": [
              "admin",
              "qa",
              "reader"
            ]
          }
        },
        "required": [
          "role"
        ]
      },
      "AddCaseInput": {
        "type": "object",
        "properties": {
          "projeto_id": {
            "$ref": "#/components/schemas/CoercedPositiveId"
          }
        },
        "required": [
          "projeto_id"
        ]
      },
      "AddSuiteInput": {
        "type": "object",
        "properties": {
          "suite_id": {
            "$ref": "#/components/schemas/CoercedPositiveId"
          }
        },
        "required": [
          "suite_id"
        ]
      }
    },
    "parameters": {
      "LegacyId": {
        "name": "id",
        "in": "path",
        "required": true,
        "description": "ID legado: regex decimal; aceita zero/zeros iniciais, sem limite superior no validator. Não confundir com IDs estritos de /projects.",
        "schema": {
          "type": "string",
          "pattern": "^\\d+$"
        }
      },
      "ProjectId": {
        "name": "id",
        "in": "path",
        "required": true,
        "description": "Inteiro positivo de /projects; texto de rota não aceita zero nem zeros iniciais.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 2147483647
        }
      },
      "ProjetoId": {
        "name": "projetoId",
        "in": "path",
        "required": true,
        "description": "ID legado do caso (projetos.id).",
        "schema": {
          "type": "string",
          "pattern": "^\\d+$"
        }
      },
      "SuiteId": {
        "name": "suiteId",
        "in": "path",
        "required": true,
        "description": "ID da suíte.",
        "schema": {
          "type": "string",
          "pattern": "^\\d+$"
        }
      },
      "Page": {
        "name": "page",
        "in": "query",
        "required": false,
        "description": "Opt-in: informar page ou limit ativa envelope; Zod faz coerção.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        }
      },
      "Limit": {
        "name": "limit",
        "in": "query",
        "required": false,
        "description": "Opt-in; máximo validado de 100.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 20
        }
      }
    },
    "responses": {
      "Http400": {
        "description": "JSON inválido no parser ou campo obrigatório do banco (23502); serviço pode produzir 400 nos caminhos descritos.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http401": {
        "description": "JWT ausente, inválido, expirado ou revogado.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http403": {
        "description": "Perfil insuficiente ou restrição administrativa descrita na operação.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http404": {
        "description": "Recurso ausente/excluído ou estado incompatível com restore.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http409": {
        "description": "Conflito de negócio ou unicidade (23505).",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http413": {
        "description": "Body JSON acima de 500 kb no parser.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http422": {
        "description": "Validação Zod com detalhes, referência inválida (23503) ou rejeição de negócio descrita.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http429": {
        "description": "Limite de requisições atingido no escopo configurado; bypass em test.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Http500": {
        "description": "Falha interna; mensagem mascarada em NODE_ENV=production. Não representa rollback garantido.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      }
    }
  },
  "paths": {
    "/openapi.json": {
      "get": {
        "tags": [
          "Documentação"
        ],
        "operationId": "get_openapi_json",
        "summary": "Consultar especificação OpenAPI",
        "description": "GET registrado diretamente em app.js antes de auth/Helmet/CORS/limiters. Não lê o arquivo estático da raiz; este é exportação derivada da mesma especificação.",
        "security": [],
        "responses": {
          "200": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {},
                  "description": "Documento OpenAPI 3.0 gerado de swagger.js e anotações; objeto aberto para evitar autorreferência recursiva."
                }
              }
            }
          }
        },
        "x-roles": [],
        "x-business-rules": [],
        "x-source": "backend/src/swagger.js"
      }
    }
  }
};

module.exports = swaggerJsDoc({
  definition,
  failOnErrors: true,
  apis: [
  "./routes/projetos.js",
  "./routes/projects.js",
  "./routes/testSuites.js",
  "./routes/requirements.js",
  "./routes/testPlans.js",
  "./routes/stats.js",
  "./routes/execucoesDetalhado.js",
  "./routes/relatorios.js",
  "./routes/auth.js",
  "./routes/admin.js",
  "./routes/health.js"
].map((file) => path.join(__dirname, file)),
});
