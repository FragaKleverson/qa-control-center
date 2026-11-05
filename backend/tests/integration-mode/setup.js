const path = require("node:path");
const { loadIntegrationEnvironment } = require("../../src/config/integrationTarget");
const file = process.env.QA_INTEGRATION_ENV_FILE;
const env = loadIntegrationEnvironment(file, process.env);
Object.assign(process.env, env, { QA_INTEGRATION_ENV_FILE: path.resolve(file) });
// Preserve test-only auth setup without importing the legacy DB destination overrides.
process.env.JWT_SECRET = process.env.JWT_SECRET || "disposable-integration-test-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.REGISTER_TOKEN = process.env.REGISTER_TOKEN || "disposable-registration-test-token";
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || "4";
