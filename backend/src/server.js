const app = require("./app");

// Validação de variáveis de ambiente obrigatórias em produção/desenvolvimento
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar.");
  process.exit(1);
}
if (!process.env.REGISTER_TOKEN) {
  console.error("FATAL: REGISTER_TOKEN não configurado. Defina a variável de ambiente antes de iniciar.");
  process.exit(1);
}

async function start() {
  try {
    app.listen(3001, "0.0.0.0", () => {
      console.log("🚀 SERVER NA PORTA 3001");
    });

  } catch (err) {
    console.error("💥 FALHA AO INICIAR:", err);
    process.exit(1);
  }
}

start();