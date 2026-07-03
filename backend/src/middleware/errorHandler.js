/**
 * Middleware global de tratamento de erros.
 *
 * Responsabilidades:
 * - Loga o erro completo no servidor (stack trace incluído)
 * - Em produção (NODE_ENV=production): nunca expõe mensagens internas ao cliente
 * - Em desenvolvimento: retorna a mensagem de erro para facilitar debug
 * - Traduz erros conhecidos do PostgreSQL para respostas HTTP semânticas
 *
 * Deve ser registrado como o ÚLTIMO middleware em app.js (após o handler 404).
 * Captura erros passados via next(err) pelas rotas.
 */

// Códigos de erro do PostgreSQL relevantes para a API
const PG_UNIQUE_VIOLATION    = "23505"; // UNIQUE constraint
const PG_FK_VIOLATION        = "23503"; // FOREIGN KEY constraint
const PG_NOT_NULL_VIOLATION  = "23502"; // NOT NULL constraint

function errorHandler(err, req, res, next) {
  // Se a resposta já foi iniciada, delega ao handler padrão do Express
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let message = err.message;

  // Traduz erros do driver pg para respostas semânticas
  if (err.code === PG_UNIQUE_VIOLATION) {
    status = 409;
    message = "Registro duplicado — já existe um registro com esses dados";
  } else if (err.code === PG_FK_VIOLATION) {
    status = 422;
    message = "Referência inválida — o recurso relacionado não existe";
  } else if (err.code === PG_NOT_NULL_VIOLATION) {
    status = 400;
    message = "Campo obrigatório ausente";
  }

  // Erros de parse de JSON no body (SyntaxError do body-parser)
  if (err instanceof SyntaxError && err.status === 400) {
    status = 400;
    message = "JSON inválido no corpo da requisição";
  }

  const isProd = process.env.NODE_ENV === "production";

  // Loga apenas erros inesperados (5xx) — erros de negócio (4xx) são esperados
  if (status >= 500) {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — Status: ${status} — ${err.stack || err.message}`
    );
  }

  // Em produção, mensagens de erro interno nunca são expostas ao cliente
  const responseMessage = status >= 500 && isProd ? "Erro interno do servidor" : message;

  res.status(status).json({ error: responseMessage });
}

module.exports = errorHandler;
