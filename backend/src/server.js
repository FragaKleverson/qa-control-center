const app = require("./app");

const server = app.listen(3001, () => {
    console.log("🚀 SERVER ESCUTANDO NA PORTA 3001");
});

server.on("error", (err) => {
    console.log("💥 ERRO NO SERVER:", err);
});