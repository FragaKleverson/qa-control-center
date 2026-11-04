const express = require("express");
const router = express.Router();
const service = require("../services/projectCatalogService");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { idParamSchema, listQuerySchema, createSchema, updateSchema } = require("../validators/projects");
const actor = (req) => ({ userId: req.user.id, ipAddress: req.ip });

// authenticate is mounted by app.js before this router, as for other protected resources.
router.use(authorize());
router.get("/", validate(listQuerySchema, "query"), async (req, res, next) => {
  try {
    // Express 5 query is a getter; explicitly pass the parsed values.
    res.json(await service.listAll(listQuerySchema.parse(req.query)));
  } catch (err) { next(err); }
});
router.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try { res.json(await service.getById(req.params.id)); } catch (err) { next(err); }
});
router.post("/", authorize("admin", "qa"), validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await service.create(req.body, actor(req))); } catch (err) { next(err); }
});
router.put("/:id", authorize("admin", "qa"), validate(idParamSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try { res.json(await service.update(req.params.id, req.body, actor(req))); } catch (err) { next(err); }
});
router.delete("/:id", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    await service.delete(req.params.id, actor(req));
    res.json({ message: "Project excluído com sucesso" });
  } catch (err) { next(err); }
});
router.post("/:id/restore", authorize("admin"), validate(idParamSchema, "params"), async (req, res, next) => {
  try { res.json(await service.restore(req.params.id, actor(req))); } catch (err) { next(err); }
});
module.exports = router;
