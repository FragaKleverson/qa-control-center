const app = require("./app");
const { init } = require("./init-db");

async function start() {
  try {
    await init();

    app.listen(3001, "0.0.0.0", () => {
      console.log("🚀 SERVER NA PORTA 3001");
    });

  } catch (err) {
    console.error("💥 FALHA AO INICIAR:", err);
    process.exit(1);
  }
}

start();