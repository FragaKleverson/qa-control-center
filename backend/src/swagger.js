const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QA Control Center API',
      version: '1.0.0',
      description: 'API para gerenciar projetos, testes, execuções e relatórios de QA',
      contact: {
        name: 'QA Team',
        url: 'https://github.com/FragaKleverson/qa-control-center',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Desenvolvimento',
      },
      {
        url: 'https://api.qa-control.com',
        description: 'Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token. Copie o token do login e cole aqui. Clique em "Authorize" para usar em todas requisições.',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, './routes/auth.js'),
    path.join(__dirname, './routes/projetos.js'),
    path.join(__dirname, './routes/testSuites.js'),
    path.join(__dirname, './routes/requirements.js'),
    path.join(__dirname, './routes/testPlans.js'),
    path.join(__dirname, './routes/execucoesDetalhado.js'),
    path.join(__dirname, './routes/relatorios.js'),
    path.join(__dirname, './routes/stats.js'),
  ],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
