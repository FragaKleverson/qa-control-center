const app = require("./app");
const { PORT } = require("./config/env");

// Variáveis obrigatórias já validadas em config/env.js no boot

async function start() {
  try {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 SERVER NA PORTA ${PORT}`);
    });

  } catch (err) {
    console.error("💥 FALHA AO INICIAR:", err);
    process.exit(1);
  }
}

start();