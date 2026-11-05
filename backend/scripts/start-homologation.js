const path = require("node:path");
const net = require("node:net");
const { pathToFileURL } = require("node:url");
const { loadHomologationEnvironment, readHomologationConfig } = require("../src/config/homologation");
function assertFree(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () => reject(new Error("HOMOLOGATION_GUARD: HTTP_PORT_UNAVAILABLE")));
    probe.listen({ host: "127.0.0.1", port, exclusive: true }, () => probe.close(resolve));
  });
}
async function main() {
  const [file, action = "start"] = process.argv.slice(2);
  if (!["start", "check"].includes(action)) throw new Error("HOMOLOGATION_GUARD: INVALID_ACTION");
  const env = loadHomologationEnvironment(file);
  Object.assign(process.env, env);
  await assertFree(Number(env.PORT)); await assertFree(Number(env.QA_HOMOLOGATION_FRONTEND_PORT));
  const pool = require("../src/db");
  let vite, server;
  try {
    const client = await pool.connect(); client.release(); // Real cluster/socket guard before listen.
    if (action === "check") {
      console.log(JSON.stringify({ database: readHomologationConfig(env).database, host: "127.0.0.1", port: 5435, identityVerified: true, realAuth: !require("../src/config/env").isTest }));
      await pool.end(); return;
    }
    const { createServer } = await import(pathToFileURL(path.resolve(__dirname, "../../frontend/node_modules/vite/dist/node/index.js")).href);
    vite = await createServer({ root: path.resolve(__dirname, "../../frontend"), configFile: path.resolve(__dirname, "../../frontend/vite.config.js"), server: { host: "127.0.0.1", port: 5175, strictPort: true } });
    const app = require("../src/app"); // NODE_ENV=development: real JWT, no injected user.
    server = await new Promise((resolve, reject) => { const http = app.listen(3105, "127.0.0.1", () => resolve(http)); http.once("error", reject); });
    await vite.listen();
    console.log("HOMOLOGATION_READY frontend=http://127.0.0.1:5175 backend=http://127.0.0.1:3105 realAuth=true");
    const stop = async () => { await vite.close(); server.close(); await pool.end(); process.exit(0); };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  } catch (error) { if (server) server.close(); if (vite) await vite.close(); await pool.end(); throw error; }
}
if (require.main === module) main().catch(() => { console.error("HOMOLOGATION_GUARD: startup refused; verify explicit configuration, free ports and real cluster identity."); process.exitCode = 1; });
module.exports = { assertFree };
