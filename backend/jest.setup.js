// Define NODE_ENV como 'test' para usar .env.test
process.env.NODE_ENV = 'test';

// ─── GUARD DE ISOLAMENTO DO BANCO DE TESTES ───────────────────────────────────
// DB_DATABASE é definido ANTES do dotenv ser carregado em config/env.js.
// Como dotenv NÃO sobrescreve variáveis já definidas no processo,
// isso garante que os testes NUNCA se conectem ao banco de produção,
// mesmo que .env.test esteja ausente ou mal configurado.
process.env.DB_DATABASE = 'qa_control_test';
process.env.DB_PORT     = process.env.DB_PORT || '5434';
process.env.DB_HOST     = process.env.DB_HOST || 'localhost';
process.env.DB_USER     = process.env.DB_USER || 'qauser';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'qapass';

// Valores padrão para testes — nunca usar em produção
process.env.JWT_SECRET        = process.env.JWT_SECRET        || 'test-secret-jwt-do-not-use-in-production';
process.env.REGISTER_TOKEN    = process.env.REGISTER_TOKEN    || 'test-register-token';
process.env.BCRYPT_ROUNDS     = process.env.BCRYPT_ROUNDS     || '4';
