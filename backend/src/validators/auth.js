/**
 * Schemas Zod para as rotas de autenticação.
 */

const { z } = require("zod");

// Registro: name, email e password são obrigatórios
const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(255, "Nome muito longo"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128, "Senha muito longa"),
});

// Login: apenas email e senha — sem regra de tamanho mínimo de senha aqui
// (a regra de negócio de credenciais fica no service)
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Forgot password: apenas email
const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

// Reset password: token + nova senha
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128, "Senha muito longa"),
});

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
