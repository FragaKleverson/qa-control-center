const TARGET = Object.freeze({ host: '127.0.0.1', port: 5436, database: 'qa_control_history_rehearsal', user: 'qa_history_runner' });
const fail = code => { throw new Error(`HISTORY_GUARD: ${code}`); };
function config(env) {
  if (env.QA_HISTORY_AUTHORIZATION !== 'authorized') fail('AUTHORIZATION_REQUIRED');
  if (env.DB_HOST !== TARGET.host || env.DB_PORT !== String(TARGET.port) || env.DB_DATABASE !== TARGET.database || env.DB_USER !== TARGET.user) fail('TARGET_NOT_ALLOWED');
  if (!env.DB_PASSWORD || !/^\d{10,30}$/.test(env.QA_HISTORY_CLUSTER_ID || '')) fail('CREDENTIAL_OR_CLUSTER_MISSING');
  if (Object.keys(env).some(key => key.startsWith('PG') || ['DB_NAME', 'QA_INTEGRATION_MODE', 'QA_HOMOLOGATION_MODE'].includes(key))) fail('CONFLICTING_OVERRIDE');
  try {
    const u = new URL(env.DATABASE_URL);
    if (u.protocol !== 'postgresql:' || u.hostname !== TARGET.host || u.port !== String(TARGET.port) || u.pathname !== `/${TARGET.database}` || u.search || u.hash || decodeURIComponent(u.username) !== TARGET.user || decodeURIComponent(u.password) !== env.DB_PASSWORD) fail('URL_MISMATCH');
  } catch { fail('URL_MISMATCH'); }
  return { ...TARGET, password: env.DB_PASSWORD, clusterId: env.QA_HISTORY_CLUSTER_ID };
}
async function verify(client, cfg) {
  if (client.connection?.stream?.remoteAddress !== TARGET.host || client.connection?.stream?.remotePort !== TARGET.port) fail('SOCKET_MISMATCH');
  const row = (await client.query('SELECT current_database() AS db, current_user AS usr, inet_server_port() AS port, system_identifier::text AS cluster FROM pg_control_system()')).rows[0];
  if (!row || row.db !== TARGET.database || row.usr !== TARGET.user || row.port !== 5432 || row.cluster !== cfg.clusterId) fail('IDENTITY_MISMATCH');
  return row;
}
function prismaGate(env) {
  config(env);
  const age = Date.now() - Number(env.QA_HISTORY_VERIFIED_AT);
  if (env.QA_HISTORY_VERIFIED_CLUSTER !== env.QA_HISTORY_CLUSTER_ID || !Number.isFinite(age) || age < 0 || age > 60000) fail('VERIFIED_RUNNER_REQUIRED');
}
module.exports = { TARGET, config, verify, prismaGate };
