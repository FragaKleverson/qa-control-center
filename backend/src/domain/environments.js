const { z } = require("zod");

const ENVIRONMENTS = Object.freeze(["staging", "production", "development", "homologação"]);
const environmentSchema = z.enum(ENVIRONMENTS);
module.exports = { ENVIRONMENTS, environmentSchema };
