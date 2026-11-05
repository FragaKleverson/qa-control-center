jest.mock("../../src/db", () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock("../../src/services/auditService", () => ({ logAudit: jest.fn().mockResolvedValue() }));
const express = require("express");
const request = require("supertest");
const service = require("../../src/services/testPlansService");
const router = require("../../src/routes/testPlans");
const errorHandler = require("../../src/middleware/errorHandler");
const app = express(); app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1, role: req.headers["x-role"] || "reader" }; next(); });
app.use("/test-plans", router); app.use(errorHandler);
afterEach(() => jest.restoreAllMocks());
it.each(["qa", "reader"])("denies deletion for %s", async (role) => {
  const spy = jest.spyOn(service, "delete");
  expect((await request(app).delete("/test-plans/1").set("x-role", role)).status).toBe(403);
  expect(spy).not.toHaveBeenCalled();
});
it("admin can delete executed plan", async () => {
  jest.spyOn(service, "delete").mockResolvedValue({ id: 1, executed_at: new Date() });
  expect((await request(app).delete("/test-plans/1").set("x-role", "admin")).status).toBe(200);
});
it("execute route never passes client environment to service", async () => {
  const spy = jest.spyOn(service, "execute").mockResolvedValue({ id: 2 });
  expect((await request(app).post("/test-plans/1/execute").set("x-role", "qa").send({ ambiente: "qa" })).status).toBe(201);
  expect(spy).toHaveBeenCalledWith("1", 1);
});
it("invalid plan environment returns 422", async () => {
  expect((await request(app).post("/test-plans").set("x-role", "qa").send({ titulo: "Plan", ambiente: "dev" })).status).toBe(422);
});
