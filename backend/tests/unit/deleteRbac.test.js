jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../src/config/env", () => ({ jwt: { secret: "isolated-rbac-secret" } }));
jest.mock("../../src/services/auditService", () => ({ logAudit: jest.fn().mockResolvedValue() }));
const express = require("express"), request = require("supertest"), jwt = require("jsonwebtoken");
const pool = require("../../src/db"), services = require("../../src/services");
const catalog = require("../../src/services/projectCatalogService"), auth = require("../../src/services/authService");
const { logAudit } = require("../../src/services/auditService");
const app = express(); app.use(express.json()); app.use(require("../../src/middleware/auth"));
for (const [base, file] of [["projects","projects"],["projetos","projetos"],["test-suites","testSuites"],["test-plans","testPlans"],["execucoes","execucoesDetalhado"],["requirements","requirements"],["admin","admin"],["relatorios","relatorios"]]) app.use("/"+base,require("../../src/routes/"+file));
app.use(require("../../src/middleware/errorHandler"));
const modules = [["projects",catalog,{nome:"P"}],["projetos",services.projectsService,{titulo:"T",descricao:"D",feature:"F"}],
  ["test-suites",services.testSuitesService,{nome:"S"}],["test-plans",services.testPlansService,{titulo:"P",ambiente:"staging"}],
  ["execucoes",services.executionsService,{suite_id:1}],["requirements",services.requirementsService,{titulo:"R"}]];
const operations = modules.flatMap(([base,service]) => [["delete","/"+base+"/1",service,"delete"],["post","/"+base+"/1/restore",service,"restore"]]);
operations.push(["delete","/test-suites/1/cases/2",services.testSuitesService,"removeCase"],["delete","/test-plans/1/suites/2",services.testPlansService,"removeSuite"],["delete","/admin/usuarios/2",auth,"deleteUser"]);
const token = role => jwt.sign({sub:1,role,email:"isolated@example.invalid"},"isolated-rbac-secret",{expiresIn:"1h"});
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });
describe.each(operations)("%s %s", (method,url,service,operation) => {
  test.each(["qa","reader"])("denies %s before service, audit or database effects", async role => {
    const spy=jest.spyOn(service,operation).mockResolvedValue({id:1});
    const response=await request(app)[method](url).set("Authorization","Bearer "+token(role)).send({});
    expect(response.status).toBe(403); expect(spy).not.toHaveBeenCalled(); expect(logAudit).not.toHaveBeenCalled(); expect(pool.query).not.toHaveBeenCalled(); expect(pool.connect).not.toHaveBeenCalled();
  });
  test("Admin reaches the operation", async () => {
    const spy=jest.spyOn(service,operation).mockResolvedValue({id:1});
    expect((await request(app)[method](url).set("Authorization","Bearer "+token("admin")).send({})).status).toBe(200); expect(spy).toHaveBeenCalledTimes(1);
  });
  test("unauthenticated is denied", async () => { expect((await request(app)[method](url).send({})).status).toBe(401); expect(pool.query).not.toHaveBeenCalled(); });
});
describe.each(modules)("%s creation/edit", (base,service,payload) => {
  test.each(["post","put"])("Reader cannot %s", async method => {
    const spy=jest.spyOn(service,method==="post"?"create":"update");
    expect((await request(app)[method]("/"+base+(method==="put"?"/1":"")).set("Authorization","Bearer "+token("reader")).send(payload)).status).toBe(403);
    expect(spy).not.toHaveBeenCalled(); expect(pool.query).not.toHaveBeenCalled(); expect(logAudit).not.toHaveBeenCalled();
  });
  test.each(["admin","qa"])("%s can create", async role => {
    const spy=jest.spyOn(service,"create").mockResolvedValue({id:1});
    expect((await request(app).post("/"+base).set("Authorization","Bearer "+token(role)).send(payload)).status).toBe(201); expect(spy).toHaveBeenCalledTimes(1);
  });
  test.each(["admin","qa"])("%s can edit when domain rules permit", async role => {
    jest.spyOn(service,"getById").mockResolvedValue({id:1});
    const spy=jest.spyOn(service,"update").mockResolvedValue({id:1});
    expect((await request(app).put("/"+base+"/1").set("Authorization","Bearer "+token(role)).send(payload)).status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
test.each(["generate","export"])("Reader cannot invoke Reports %s", async action => {
  const spy=jest.spyOn(services.reportsService,"generateReport");
  expect((await request(app).post("/relatorios/"+action).set("Authorization","Bearer "+token("reader")).send({})).status).toBe(403); expect(spy).not.toHaveBeenCalled(); expect(pool.query).not.toHaveBeenCalled();
});
