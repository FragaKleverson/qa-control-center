module.exports = {
  testEnvironment: "node",
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Cobertura de código: relatório em texto + lcov
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  // Apenas arquivos de src entram na métrica de cobertura
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",   // ponto de entrada — não há lógica a testar
    "!src/init-db.js",  // script avulso de inicialização
    "!src/generator.js" // gerador de doc Word (sem rota ativa)
  ],
  // Timeout por teste (integração com banco pode ser mais lento)
  testTimeout: 15000,
};