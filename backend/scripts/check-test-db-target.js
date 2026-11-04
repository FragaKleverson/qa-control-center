// Offline preflight: never imports pg, Prisma, application config or database code.
const TARGET_KEYS = ["DATABASE_URL", "DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD"];
const PG_OVERRIDES = ["PGHOST", "PGHOSTADDR", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD", "PGSERVICE", "PGSERVICEFILE", "PGOPTIONS"];
const hostPattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?|\[[0-9a-fA-F:]+\])$/;
const clean = (value) => typeof value === "string" && value.length > 0 && value === value.trim();
const port = (value) => /^\d+$/.test(value || "") && Number(value) > 0 && Number(value) <= 65535;
const host = (value) => clean(value) && hostPattern.test(value);

function inspectTarget(env, authorized) {
  const errors = [];
  let prisma = null, pool = null;
  if (!authorized || !host(authorized.host) || !port(authorized.port) || authorized.database !== "qa_control_test") {
    errors.push("AUTHORIZATION_REQUIRED: explicitly authorize host, port and qa_control_test");
  }
  for (const key of TARGET_KEYS) if (!clean(env[key])) errors.push(`MISSING_OR_INVALID: ${key}`);
  if (PG_OVERRIDES.some((key) => env[key] !== undefined)) errors.push("AMBIGUOUS_PG_OVERRIDES");
  if (host(env.DB_HOST) && port(env.DB_PORT) && /^[a-zA-Z0-9_]+$/.test(env.DB_DATABASE || "")) {
    pool = { host: env.DB_HOST.toLowerCase(), port: Number(env.DB_PORT), database: env.DB_DATABASE };
  } else errors.push("INVALID_POOL_DESTINATION");
  try {
    const url = new URL(env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !host(url.hostname) || !port(url.port) || url.hash ||
        !url.username || !url.password || !/^\/[a-zA-Z0-9_]+$/.test(url.pathname)) throw new Error();
    // Reject host overrides, multi-host URLs, sockets and arbitrary driver options.
    const params = [...url.searchParams.entries()];
    if (params.some(([key, value]) => key !== "schema" || value !== "public") || params.length > 1) throw new Error();
    if (decodeURIComponent(url.username) !== env.DB_USER || decodeURIComponent(url.password) !== env.DB_PASSWORD) {
      errors.push("PRISMA_POOL_CREDENTIAL_MISMATCH");
    }
    prisma = { host: url.hostname.toLowerCase(), port: Number(url.port), database: url.pathname.slice(1) };
  } catch { errors.push("INVALID_OR_AMBIGUOUS_DATABASE_URL"); }
  if (prisma && pool && JSON.stringify(prisma) !== JSON.stringify(pool)) errors.push("PRISMA_POOL_DESTINATION_MISMATCH");
  for (const target of [prisma, pool].filter(Boolean)) {
    if (target.database !== "qa_control_test") errors.push("NOT_TEST_DATABASE");
    if (!authorized || target.host !== authorized.host?.toLowerCase() || target.port !== Number(authorized.port) || target.database !== authorized.database) {
      errors.push("DESTINATION_NOT_AUTHORIZED");
    }
  }
  return { ok: errors.length === 0, prisma, pool, errors: [...new Set(errors)] };
}

function run(args, inherited = process.env, readFile = require("node:fs").readFileSync) {
  // Explicit file only. Never auto-load .env or print raw parse exceptions.
  try {
    const allowed = ["--env-file", "--authorize-host", "--authorize-port", "--authorize-database"];
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!allowed.includes(args[index]) || !args[index + 1] || options[args[index]]) throw new Error();
      options[args[index]] = args[index + 1];
    }
    if (allowed.some((key) => !options[key])) throw new Error();
    const source = readFile(options["--env-file"], "utf8");
    const parsed = require("dotenv").parse(source);
    // dotenv would silently keep inherited values. Refuse differences instead.
    if (TARGET_KEYS.some((key) => inherited[key] !== undefined && parsed[key] !== undefined && inherited[key] !== parsed[key])) {
      return { ok: false, errors: ["AMBIGUOUS_ENV_SOURCES"] };
    }
    // Duplicated target definitions are ambiguous even if dotenv would accept them.
    for (const key of TARGET_KEYS) {
      const definitions = source.split(/\r?\n/).filter((line) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*(?:=|:\\s)`).test(line));
      if (definitions.length > 1) return { ok: false, errors: ["DUPLICATED_ENV_DEFINITION"] };
    }
    return inspectTarget({ ...parsed, ...inherited }, {
      host: options["--authorize-host"], port: options["--authorize-port"], database: options["--authorize-database"],
    });
  } catch { return { ok: false, errors: ["INVALID_ARGUMENTS_OR_UNREADABLE_ENV_FILE"] }; }
}
if (require.main === module) {
  const report = run(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}
module.exports = { inspectTarget, run };
