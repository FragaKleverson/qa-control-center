// Deliberately separate from integration/homologation. No dotenv or application startup.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { TARGET, config, verify } = require('./history-rehearsal-guard');
const backend = path.resolve(__dirname, '..');
const root = path.dirname(backend);
const secrets = path.join(backend, '.env.history-rehearsal.local');
const evidence = path.join(backend, 'test-results/history-rehearsal');
const stage = path.join(evidence, 'prisma');
const source = path.join(backend, 'prisma/migrations');
const names = fs.readdirSync(source).filter(n => fs.existsSync(path.join(source, n, 'migration.sql'))).sort();
assert.equal(names.length, 10, 'Unexpected migration history');
assert.deepEqual(names.slice(8), ['20261030000000_add_plan_execution_guard', '20261030000001_create_projects_and_optional_case_link']);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const json = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n');
function environment() {
  const parsed = require('dotenv').parse(fs.readFileSync(secrets));
  assert.equal(parsed.QA_HISTORY_AUTHORIZATION, undefined, 'Do not persist consent');
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] !== undefined) assert.equal(process.env[key], value, 'Inherited configuration conflict');
  }
  const env = { ...process.env, ...parsed };
  config(env);
  return env;
}
function cleanError(error) {
  // Neither raw connection errors nor Prisma URLs are printed on failure.
  return { name: error.name, code: error.code || null, message: error.message.startsWith('HISTORY_GUARD:') ? error.message : 'Operation failed; inspect sanitized evidence and script assertions.' };
}
async function connection(env) {
  const cfg = config(env);
  const { Client } = require('pg');
  const client = new Client({ host: cfg.host, port: cfg.port, database: cfg.database, user: cfg.user, password: cfg.password, connectionTimeoutMillis: 5000 });
  await client.connect();
  try { await verify(client, cfg); return client; } catch (err) { await client.end(); throw err; }
}
async function inspect(env, action) {
  const client = await connection(env);
  try { return await action(client); } finally { await client.end(); }
}
async function history(env, expected) {
  return inspect(env, async client => {
    const exists = (await client.query("SELECT to_regclass('public._prisma_migrations') AS name")).rows[0].name;
    const rows = exists ? (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows : [];
    assert.deepEqual(rows.map(r => r.migration_name), names.slice(0, expected));
    for (const row of rows) {
      assert(row.finished_at && !row.rolled_back_at);
      assert.equal(row.checksum, sha(fs.readFileSync(path.join(source, row.migration_name, 'migration.sql'))));
    }
    return rows;
  });
}
async function migrate(env, count) {
  await history(env, count === 8 ? 0 : count - 1);
  for (const name of names.slice(0, count)) {
    const dest = path.join(stage, 'migrations', name); fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(path.join(source, name, 'migration.sql'), path.join(dest, 'migration.sql'));
  }
  fs.copyFileSync(path.join(source, 'migration_lock.toml'), path.join(stage, 'migrations/migration_lock.toml'));
  // validate uses the real schema; migrate deploy executes only copied, byte-identical SQL.
  fs.copyFileSync(path.join(backend, 'prisma/schema.prisma'), path.join(stage, 'schema.prisma'));
  fs.writeFileSync(path.join(stage, 'config.ts'), `import { defineConfig } from ${JSON.stringify(path.join(backend, 'node_modules/prisma/config').replaceAll('\\','/'))};\nimport guard from ${JSON.stringify(path.join(__dirname, 'history-rehearsal-guard.js').replaceAll('\\','/'))};\nguard.prismaGate(process.env);\nexport default defineConfig({schema:${JSON.stringify(path.join(stage,'schema.prisma').replaceAll('\\','/'))},migrations:{path:${JSON.stringify(path.join(stage,'migrations').replaceAll('\\','/'))}},datasource:{url:process.env.DATABASE_URL}});\n`);
  await inspect(env, async c => verify(c, config(env)));
  const child = spawnSync(process.execPath, [path.join(backend, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--config', path.join(stage, 'config.ts')], {
    cwd: evidence, encoding: 'utf8', timeout: 120000,
    env: { ...env, CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', QA_HISTORY_VERIFIED_CLUSTER: env.QA_HISTORY_CLUSTER_ID, QA_HISTORY_VERIFIED_AT: String(Date.now()) },
  });
  const sanitize = s => (s || '').replaceAll(env.DATABASE_URL, '[DATABASE_URL]').replaceAll(env.DB_PASSWORD, '[REDACTED]').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[DATABASE_URL]');
  json(`migrate-${count}.json`, { status: child.status, stdout: sanitize(child.stdout), stderr: sanitize(child.stderr), error: child.error?.code });
  assert.equal(child.status, 0, `Prisma failed at stage ${count}`);
  json(`history-${count}.json`, await history(env, count));
  console.log(`Prisma: ${count} migrations applied and verified.`);
}
const tables = ['users','password_reset_tokens','revoked_tokens','projetos','test_suites','requirements','test_plans','execucoes','test_suite_cases','test_plan_suites','execution_results','audit_logs'];
async function snapshot(client) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const data = {};
    for (const table of tables) data[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY id`)).rows.map(r => r.row);
    const sequences = (await client.query("SELECT sequencename, last_value, start_value, increment_by FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows;
    const constraints = (await client.query("SELECT conname, conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS definition, convalidated FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conname, table_name")).rows;
    const indexes = (await client.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows;
    await client.query('COMMIT');
    return { data, sequences, constraints, indexes, checksums: Object.fromEntries(Object.entries(data).map(([t, rows]) => [t, { count: rows.length, ids: rows.map(r=>r.id), sha256: sha(JSON.stringify(rows)) }])) };
  } catch (err) { await client.query('ROLLBACK'); throw err; }
}
async function seed(client) {
  await client.query('BEGIN');
  try {
    const insert = async (table, obj) => {
      const fields=Object.keys(obj);const values=Object.values(obj);
      return (await client.query(`INSERT INTO "${table}" (${fields.map(f=>`"${f}"`).join(',')}) VALUES (${fields.map((_,i)=>`$${i+1}`).join(',')}) RETURNING id`, values)).rows[0].id;
    };
    const fixed = '2025-04-12T10:20:30.123Z';
    const users=[];
    for (const role of ['admin','qa','reader']) users.push(await insert('users',{name:`Synthetic ${role}`,email:`${role}@history.invalid`,password_hash:require('bcryptjs').hashSync(crypto.randomBytes(24).toString('hex'),4),role,created_at:fixed}));
    await insert('password_reset_tokens',{user_id:users[1],token_hash:'synthetic-expired-hash',expires_at:fixed,used_at:fixed,created_at:fixed});
    await insert('revoked_tokens',{jti:'00000000-0000-4000-8000-000000000001',expires_at:fixed,created_at:fixed});
    const cases=[];
    const scenarios=[null,[],[{nome:'Cenário com acentuação',passos:['Dado legado','Quando consultar'],extra:{preservar:true}}],{historico:'objeto JSON válido',steps:'texto\nmultilinha'},['texto histórico', {cenario:'estrutura alternativa'}]];
    for (let i=0;i<scenarios.length;i++) cases.push(await insert('projetos',{titulo:`Legado sintético ${i}`,descricao:i===0?null:`Descrição ${i}`,feature:i===0?null:`Feature: legado ${i}`,cenarios:scenarios[i]===null?null:JSON.stringify(scenarios[i]),created_by:i===0?null:users[1],created_at:fixed,updated_at:fixed,deleted_at:i===4?fixed:null}));
    const suites=[];
    for(let i=0;i<3;i++) suites.push(await insert('test_suites',{nome:`Suíte histórica ${i}`,descricao:'Preservar vínculos',projeto_id:cases[i],created_by:users[1],created_at:fixed,updated_at:fixed,deleted_at:i===2?fixed:null}));
    for(const [s,c] of [[0,0],[0,1],[1,1],[1,2],[1,4],[2,3]]) await insert('test_suite_cases',{suite_id:suites[s],projeto_id:cases[c],created_at:fixed});
    const plans=[];
    for(const [i,ambiente] of ['staging','qa','',null,'homologação'].entries()) plans.push(await insert('test_plans',{titulo:`Plano histórico ${i}`,descricao:'Sem origem comprovada',ambiente,created_at:fixed,updated_at:fixed,deleted_at:i===4?fixed:null}));
    for(const [p,s] of [[0,0],[0,1],[1,2],[4,1]]) await insert('test_plan_suites',{plan_id:plans[p],suite_id:suites[s],created_at:fixed});
    const executions=[];
    for(const [i,status] of ['pending','running','passed','failed','blocked','completed','skipped','in_progress'].entries()) {
      const id=await insert('execucoes',{suite_id:suites[i%3],ambiente:['dev','qa','production',null][i%4],status,resultado:`Resultado histórico ${i}`,finalized:i>=2,created_by:i===0?null:users[1],created_at:fixed,updated_at:fixed,deleted_at:i===3?fixed:null});executions.push(id);
      for(const c of cases.slice(0,2)) await insert('execution_results',{execucao_id:id,projeto_id:c,status,comentario:'Comentário\ninalterado',created_at:fixed,updated_at:fixed});
    }
    for(const [i,status] of ['Open','In Progress','Closed','Blocked'].entries()) await insert('requirements',{titulo:`Requisito ${i}`,descricao:i===0?null:'Histórico',status,prioridade:['Low','Medium','High','Critical'][i],created_by:users[1],created_at:fixed,updated_at:fixed,deleted_at:i===3?fixed:null});
    for(const [i,action] of ['CREATE','UPDATE','DELETE','RESTORE'].entries()) await insert('audit_logs',{user_id:users[0],entity_type:'projeto',entity_id:cases[i],action,old_values:JSON.stringify({titulo:'Anterior',cenarios:scenarios[i]}),new_values:JSON.stringify({titulo:'Posterior'}),ip_address:'127.0.0.1',created_at:fixed});
    await client.query('COMMIT');
  } catch(err) { await client.query('ROLLBACK');throw err; }
}
async function serviceChecks(client) {
  // Run real read methods through the verified connection in a READ ONLY transaction.
  const db = require.resolve('../src/db'); const previous=require.cache[db];
  require.cache[db]={id:db,filename:db,loaded:true,exports:{query:async(...args)=>{await verify(client,config(environment()));return client.query(...args);}}};
  const results=[];
  await client.query('BEGIN READ ONLY');
  try {
    for(const name of ['projectsService','projectCatalogService','testSuitesService','testPlansService','executionsService','requirementsService','reportsService']) {
      const svc=require(`../src/services/${name}`);
      for(const options of [{},{page:1,limit:2}]) { const value=await svc.listAll(options);assert(value);results.push({service:name,paginated:Boolean(options.page),ok:true}); }
    }
    const cases=await require('../src/services/testSuitesService').getCases(1);assert(cases.length);
    const plans=await require('../src/services/testPlansService').getSuites(1);assert(plans.length);
    const resultsRows=await require('../src/services/executionsService').getResults(1);assert(resultsRows.length);
    const report=await require('../src/services/reportsService').generateReport({});assert(report);
    await client.query('COMMIT');return results;
  } catch(err) {await client.query('ROLLBACK');throw err;}
  finally { if(previous)require.cache[db]=previous;else delete require.cache[db]; }
}
async function main() {
  const operation=process.argv[2];
  if(operation==='prepare') {
    assert(!fs.existsSync(secrets) && !fs.existsSync(evidence), 'Existing rehearsal must be preserved');
    fs.mkdirSync(stage,{recursive:true});
    const password=crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secrets,`DB_HOST=${TARGET.host}\nDB_PORT=${TARGET.port}\nDB_DATABASE=${TARGET.database}\nDB_USER=${TARGET.user}\nDB_PASSWORD=${password}\nDATABASE_URL=postgresql://${TARGET.user}:${password}@${TARGET.host}:${TARGET.port}/${TARGET.database}\n`,{flag:'wx',mode:0o600});
    const files=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).stdout.split('\0').filter(Boolean);
    json('workspace-before.json',Object.fromEntries(files.filter(f=>fs.statSync(path.join(root,f)).isFile()).map(f=>[f,sha(fs.readFileSync(path.join(root,f)))])));
    json('migration-manifest.json',names.map(name=>({name,sha256:sha(fs.readFileSync(path.join(source,name,'migration.sql')))})));
    console.log('Prepared exclusive local credentials and evidence directory; no DB access.');return;
  }
  if(operation==='register') {
    assert(/^\d{10,30}$/.test(process.argv[3]||''));
    const text=fs.readFileSync(secrets,'utf8');assert(!text.includes('QA_HISTORY_CLUSTER_ID='));
    fs.appendFileSync(secrets,`QA_HISTORY_CLUSTER_ID=${process.argv[3]}\n`);console.log('Cluster identity registered locally.');return;
  }
  const env=environment();
  if(operation==='check') {json('identity.json',await inspect(env,c=>verify(c,config(env))));console.log('Identity and socket verified.');return;}
  if(operation==='baseline') {
    await inspect(env,async c=>assert.equal((await c.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0));
    await migrate(env,8);
    await inspect(env,async c=>{
      const cols=(await c.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND (column_name IN ('project_id','executed_at','legacy_classification') OR (table_name='execucoes' AND column_name='plan_id'))")).rows;
      assert.equal(cols.length,0);assert.equal((await c.query("SELECT to_regclass('public.projects') AS name")).rows[0].name,null);
      await seed(c);json('before.json',await snapshot(c));
    });console.log('Eight real migrations and synthetic history prepared; before snapshot saved.');return;
  }
  if(operation==='upgrade') {
    const before=JSON.parse(fs.readFileSync(path.join(evidence,'before.json')));
    assert.deepEqual((await inspect(env,snapshot)).data,before.data,'History changed since snapshot');
    await migrate(env,9);
    json('after-plan-migration.json',await inspect(env,snapshot));
    await migrate(env,10);
    const after=await inspect(env,snapshot);json('after.json',after);
    const normalized=structuredClone(after.data);
    for(const row of normalized.projetos){assert.equal(row.project_id,null);delete row.project_id;}
    for(const row of normalized.test_plans){assert.equal(row.executed_at,null);assert.equal(row.legacy_classification,'review_required');delete row.executed_at;delete row.legacy_classification;}
    for(const row of normalized.execucoes){assert.equal(row.plan_id,null);delete row.plan_id;}
    assert.deepEqual(normalized,before.data,'Unexpected historical field difference');
    for(const seq of before.sequences)assert.deepEqual(after.sequences.find(s=>s.sequencename===seq.sequencename),seq);
    for(const constraint of before.constraints)assert.deepEqual(after.constraints.find(c=>c.conname===constraint.conname&&c.table_name===constraint.table_name),constraint);
    for(const index of before.indexes)assert.deepEqual(after.indexes.find(i=>i.indexname===index.indexname&&i.tablename===index.tablename),index);
    const catalog=await inspect(env,async c=>{
      assert.equal((await c.query('SELECT count(*)::int AS n FROM projects')).rows[0].n,0);
      const expected=['execucoes_plan_id_fkey','execucoes_plan_id_key','test_plans_legacy_classification_check','projects_created_by_fkey','projects_nome_not_blank','projetos_project_id_fkey'];
      for(const name of expected)assert(after.constraints.some(c=>c.conname===name&&c.convalidated));
      for(const name of ['execucoes_plan_id_fkey','projetos_project_id_fkey'])assert(after.constraints.find(c=>c.conname===name).definition.includes('ON DELETE RESTRICT'));
      for(const name of ['idx_projects_deleted_created_id','idx_projects_created_by','idx_projetos_project_id'])assert(after.indexes.some(i=>i.indexname===name));
      assert((await c.query("SELECT column_default FROM information_schema.columns WHERE table_name='test_plans' AND column_name='legacy_classification'")).rows[0].column_default.includes('eligible'));
      return serviceChecks(c);
    });
    const final=await inspect(env,snapshot);assert.deepEqual(final,after,'Read checks mutated history');
    const normalizedChecksums=Object.fromEntries(Object.entries(normalized).map(([t,rows])=>[t,{count:rows.length,sha256:sha(JSON.stringify(rows)),matches:sha(JSON.stringify(rows))===before.checksums[t].sha256}]));
    json('result.json',{status:'APROVADO',identity:JSON.parse(fs.readFileSync(path.join(evidence,'identity.json'))),migrations:10,syntheticRecords:Object.values(before.data).reduce((n,r)=>n+r.length,0),comparison:normalizedChecksums,serviceChecks:catalog,newProjects:0,legacyPlansBlocked:before.data.test_plans.length,newConstraints:after.constraints.filter(c=>!before.constraints.some(b=>b.conname===c.conname&&b.table_name===c.table_name)),newIndexes:after.indexes.filter(i=>!before.indexes.some(b=>b.indexname===i.indexname&&b.tablename===i.tablename))});
    console.log('APROVADO: complete historical rows, sequences, constraints, indexes and real read services verified.');return;
  }
  throw new Error('Unknown operation');
}
main().catch(err=>{console.error(JSON.stringify(cleanError(err)));process.exitCode=1;});
