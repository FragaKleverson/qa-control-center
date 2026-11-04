const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
let policy;
beforeAll(async () => {
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, "../../../frontend/src/domain/planExecution.js"), "utf8"));
  await module.link(() => { throw new Error("Unexpected import"); }); await module.evaluate(); policy = module.namespace;
});
it("active execution offers consultation", () => {
  expect(policy.planExecutionView({ execution_id: 10, execution_deleted_at: null }).available).toBe(true);
});
it("deleted execution shows information without offering consultation or changing executed state", () => {
  const plan = Object.freeze({ execution_id: 10, execution_deleted_at: "2026-10-30", executed_at: "2026-10-29" });
  const result = policy.planExecutionView(plan);
  expect(result.available).toBe(false); expect(result.message).toContain("permanece executado");
  expect(plan.executed_at).toBe("2026-10-29");
});
it("legacy without a proven execution link does not offer consultation", () => {
  expect(policy.planExecutionView({ legacy_classification: "executed", execution_id: null }).available).toBe(false);
});
it("handles deletion between list and lookup without suggesting restore or reexecution", () => {
  expect(policy.executionLookupMessage({ status: 404 })).toContain("permanece executado");
  expect(policy.executionLookupMessage({ status: 503, message: "Servidor indisponivel" })).toBe("Servidor indisponivel");
});
