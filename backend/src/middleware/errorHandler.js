/**
 * Middleware global de tratamento de erros.
 *
 * Responsabilidades:
 * - Loga o erro completo no servidor (stack trace incluído)
 * - Em produção (NODE_ENV=production): nunca expõe mensagens internas ao cliente
 * - Em desenvolvimento: retorna a mensagem de erro para facilitar debug
 *
 * Deve ser registrado como o ÚLTIMO middleware em app.js.
 * Captura erros passados via next(err) pelas rotas.
 */
function errorHandler(err, req, res, next) {
  // Se a resposta já foi iniciada, delega ao handler padrão do Express
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  // Loga o erro completo no servidor — jamais enviado ao cliente
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — Status: ${status} — ${err.stack || err.message}`
  );

  // Em produção, mensagens de erro interno nunca são expostas
  const message =
    status >= 500 && isProd ? "Erro interno do servidor" : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
