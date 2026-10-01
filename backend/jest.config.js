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
  // Cobertura mínima (Fase 5, item 16) — piso abaixo da cobertura atual
  // (~72/56/70/75%), para travar regressões sem bloquear o dia a dia.
  // Reavaliar para cima conforme novos testes forem adicionados.
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 65,
      lines: 70,
    },
  },
  // Timeout por teste (integração com banco pode ser mais lento)
  testTimeout: 15000,
};