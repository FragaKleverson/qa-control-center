jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require("../../src/db");
const cases = require("../../src/services/projectsService");
const catalog = require("../../src/services/projectCatalogService");
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
it("coordinates real service flows on independent mock clients: delete waits for link commit", async () => {
  const linking = deferred(), finishWrite = deferred(), releasedShare = deferred(), deleteWaiting = deferred();
  const events = [];
  const caseClient = { release: jest.fn(), query: jest.fn(async sql => {
    if (sql.includes("FOR SHARE")) events.push("share");
    if (sql.startsWith("UPDATE projetos")) { linking.resolve(); await finishWrite.promise; events.push("link-write"); }
    if (sql === "COMMIT") { events.push("link-commit"); releasedShare.resolve(); }
    return { rows: [{ id: 42, project_id: 9 }] };
  }) };
  const projectClient = { release: jest.fn(), query: jest.fn(async sql => {
    if (sql.includes("FOR UPDATE")) { deleteWaiting.resolve(); await releasedShare.promise; events.push("exclusive"); }
    if (sql.startsWith("UPDATE projects")) { events.push("delete-write"); return { rows: [{ id: 9, nome: "P", deleted_at: "2026-10-30" }] }; }
    return { rows: [{ id: 9, nome: "P", deleted_at: null }] };
  }) };
  pool.connect.mockResolvedValueOnce(caseClient).mockResolvedValueOnce(projectClient);
  const link = cases.update(42, { project_id: 9 }); await linking.promise;
  const deletion = catalog.delete(9, { userId: 7 }); await deleteWaiting.promise;
  expect(events).toEqual(["share"]);
  finishWrite.resolve();
  expect(await link).toMatchObject({ id: 42, project_id: 9 });
  expect((await deletion).deleted_at).not.toBeNull();
  expect(events).toEqual(["share", "link-write", "link-commit", "exclusive", "delete-write"]);
  expect(pool.connect).toHaveBeenCalledTimes(2); expect(pool.query).not.toHaveBeenCalled();
  expect(caseClient.release).toHaveBeenCalledTimes(1); expect(projectClient.release).toHaveBeenCalledTimes(1);
});
it("coordinates deletion first: waiting association rejects parent committed as deleted", async () => {
  const exclusive = deferred(), finishDelete = deferred(), committedDelete = deferred(), linkWaiting = deferred();
  let deleted = false;
  const projectClient = { release: jest.fn(), query: jest.fn(async sql => {
    if (sql.includes("FOR UPDATE")) exclusive.resolve();
    if (sql.startsWith("UPDATE projects")) { await finishDelete.promise; deleted = true; }
    if (sql === "COMMIT") committedDelete.resolve();
    return { rows: [{ id: 9, nome: "P", deleted_at: deleted ? "2026-10-30" : null }] };
  }) };
  const caseClient = { release: jest.fn(), query: jest.fn(async sql => {
    if (sql.includes("FOR SHARE")) { linkWaiting.resolve(); await committedDelete.promise; return { rows: deleted ? [] : [{ id: 9 }] }; }
    return { rows: [] };
  }) };
  pool.connect.mockReset(); pool.connect.mockResolvedValueOnce(projectClient).mockResolvedValueOnce(caseClient);
  const deletion = catalog.delete(9, { userId: 7 }); await exclusive.promise;
  const link = cases.update(42, { project_id: 9 });
  const rejected = expect(link).rejects.toMatchObject({ statusCode: 422 });
  await linkWaiting.promise; finishDelete.resolve(); await deletion; await rejected;
  expect(caseClient.query.mock.calls.map(([sql]) => sql.split(" ")[0])).toEqual(["BEGIN", "SELECT", "ROLLBACK"]);
});
