/**
 * Classe de erro da aplicação com suporte a statusCode HTTP.
 *
 * Uso nos services:
 *   throw new AppError("Projeto não encontrado", 404);
 *   throw new AppError("Email já cadastrado", 409);
 *   throw new AppError("Execução finalizada", 422);
 *
 * O errorHandler captura e usa err.statusCode para responder corretamente.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
