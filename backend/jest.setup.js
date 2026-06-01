// Define NODE_ENV como 'test' para usar .env.test
process.env.NODE_ENV = 'test';

// Valores padrão para testes — nunca usar em produção
process.env.JWT_SECRET        = process.env.JWT_SECRET        || 'test-secret-jwt-do-not-use-in-production';
process.env.REGISTER_TOKEN    = process.env.REGISTER_TOKEN    || 'test-register-token';
process.env.BCRYPT_ROUNDS     = process.env.BCRYPT_ROUNDS     || '4';
