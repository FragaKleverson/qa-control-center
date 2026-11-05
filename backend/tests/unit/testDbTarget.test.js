const { inspectTarget, run } = require("../../scripts/check-test-db-target");
const authorized = { host: "localhost", port: "5434", database: "qa_control_test" };
const args = ["--env-file", "synthetic.env", "--authorize-host", "localhost", "--authorize-port", "5434", "--authorize-database", "qa_control_test"];
const env = () => ({ DATABASE_URL: "postgresql://fixture:synthetic-secret@localhost:5434/qa_control_test?schema=public", DB_HOST: "localhost", DB_PORT: "5434", DB_DATABASE: "qa_control_test", DB_USER: "fixture", DB_PASSWORD: "synthetic-secret" });
const source = () => Object.entries(env()).map(([key, value]) => `${key}=${value}`).join("\n");
it("compares explicit matching destinations offline without exposing credentials", () => {
  const report = inspectTarget(env(), authorized);
  expect(report).toMatchObject({ ok: true, prisma: { host: "localhost", port: 5434, database: "qa_control_test" }, pool: { host: "localhost", port: 5434, database: "qa_control_test" } });
  expect(JSON.stringify(report)).not.toMatch(/fixture|synthetic-secret|postgresql:\/\//);
});
it.each(["DATABASE_URL", "DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD"])("rejects missing %s", (key) => {
  const input = env(); delete input[key]; expect(inspectTarget(input, authorized).ok).toBe(false);
});
it.each([{ DB_HOST: "127.0.0.1" }, { DB_PORT: "5433" }, { DB_DATABASE: "qa_control" }])("rejects pool destination mismatch %j", (change) => {
  expect(inspectTarget({ ...env(), ...change }, authorized).errors).toContain("PRISMA_POOL_DESTINATION_MISMATCH");
});
it("does not infer authorization from test database name", () => {
  expect(inspectTarget(env()).ok).toBe(false);
  expect(inspectTarget(env(), { ...authorized, host: "other-host" }).errors).toContain("DESTINATION_NOT_AUTHORIZED");
});
it("rejects non-test database even if authorized explicitly", () => {
  const input = { ...env(), DB_DATABASE: "qa_control", DATABASE_URL: "postgresql://fixture:synthetic-secret@localhost:5434/qa_control" };
  expect(inspectTarget(input, { ...authorized, database: "qa_control" }).errors).toContain("NOT_TEST_DATABASE");
});
it.each(["postgresql://fixture:synthetic-secret@localhost/qa_control_test", "postgresql://fixture:synthetic-secret@localhost:5434/qa_control_test?host=other", "postgresql://fixture:synthetic-secret@localhost:5434/qa_control_test?schema=public&schema=public", "not-a-url-synthetic-secret"])("rejects ambiguous URL without leaking it", (DATABASE_URL) => {
  const report = inspectTarget({ ...env(), DATABASE_URL }, authorized);
  expect(report.ok).toBe(false); expect(JSON.stringify(report)).not.toContain("synthetic-secret");
});
it.each(["PGHOST", "PGPORT", "PGDATABASE", "PGSERVICE", "PGOPTIONS"])("rejects implicit override %s", (key) => {
  expect(inspectTarget({ ...env(), [key]: "other" }, authorized).errors).toContain("AMBIGUOUS_PG_OVERRIDES");
});
it("identifies credential divergence without exposing credentials", () => {
  const report = inspectTarget({ ...env(), DB_PASSWORD: "different-private-password" }, authorized);
  expect(report.errors).toContain("PRISMA_POOL_CREDENTIAL_MISMATCH");
  expect(JSON.stringify(report)).not.toMatch(/synthetic-secret|different-private-password/);
});
it("reads only explicitly selected env file without mutating inherited environment", () => {
  const inherited = Object.freeze({}); const read = jest.fn(() => source());
  expect(run(args, inherited, read).ok).toBe(true);
  expect(read).toHaveBeenCalledWith("synthetic.env", "utf8"); expect(inherited).toEqual({});
});
it("refuses conflicting file/process configuration", () => {
  expect(run(args, { DB_PORT: "5433" }, () => source())).toEqual({ ok: false, errors: ["AMBIGUOUS_ENV_SOURCES"] });
});
it("refuses duplicate declarations", () => {
  expect(run(args, {}, () => source() + "\nDB_HOST=localhost").errors).toContain("DUPLICATED_ENV_DEFINITION");
});
it("sanitizes argument and file errors", () => {
  expect(run(args, {}, () => { throw new Error("secret-password"); })).toEqual({ ok: false, errors: ["INVALID_ARGUMENTS_OR_UNREADABLE_ENV_FILE"] });
  expect(run([], {}, () => source()).ok).toBe(false);
  expect(run([...args, "--unknown", "secret-password"], {}, () => source()).ok).toBe(false);
});
