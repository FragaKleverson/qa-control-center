````md
# Gerador de Documentação de Testes (.DOCX)

Automatizador em **Node.js** para gerar documentos `.docx` padronizados a partir de cenários de teste escritos em **JSON**.

Ideal para times de **QA**, **Analistas de Testes**, **POs** e squads que precisam criar documentação rápida, bonita e repetível sem sofrer no Word.

---

## 🚀 Objetivo

Transformar isso:

```json
{
  "titulo": "CA1 — Integração com OAM",
  "cenarios": [...]
}
````

Nisso:

* Documento `.docx` formatado
* Header com logo da empresa
* Capa personalizada
* Cenários em Gherkin
* Arquivos separados por história/teste

---

## 📁 Estrutura do Projeto

```bash
gerador_de_doc_de_teste/
│── assets/
│   └── vivo_logo.png
│
│── config/
│   └── style.js
│
│── data/
│   └── historias.json
│
│── templates/
│   ├── cover.js
│   ├── header.js
│   └── docTemplate.js
│
│── Testes/
│   └── (arquivos gerados)
│
│── generator.js
│── package.json
│── README.md
```

---

## ⚙️ Tecnologias Utilizadas

* Node.js
* docx
* JavaScript
* JSON

---

## 📦 Instalação

Clone o projeto:

```bash
git clone https://github.com/FragaKleverson/gerador_de_doc_de_teste.git
```

Entre na pasta:

```bash
cd gerador_de_doc_de_teste
```

Instale dependências:

```bash
npm install
```

---

## ▶️ Como Executar

```bash
node generator.js
```

---

## 📄 Resultado

Os arquivos serão gerados automaticamente na pasta:

```bash
./Testes/
```

Exemplo:

```bash
ca1_integracao_oam.docx
ca2_api_autenticacao_aura.docx
ca3_middleware_bot.docx
```

---

## 🧠 Como Adicionar Novos Testes

Edite o arquivo:

```bash
data/historias.json
```

Modelo:

```json
[
  {
    "titulo": "CA1 — Integração com OAM",
    "descricao": "Validação da autenticação",
    "feature": "Integração OAM",
    "fileName": "ca1_integracao_oam",
    "background": [
      "Given sistema disponível"
    ],
    "cenarios": [
      {
        "nome": "JWT válido",
        "tipo": "success",
        "passos": [
          "Given token válido",
          "When enviar requisição",
          "Then retorna 200"
        ]
      }
    ]
  }
]
```

---

## 🎨 Personalização Visual

Edite:

```bash
config/style.js
```

Você pode alterar:

* cores
* fontes
* título da capa
* subtítulo
* versão
* descrição

---

## 🖼️ Logo da Empresa

Adicione sua logo em:

```bash
assets/vivo_logo.png
```

Se quiser trocar:

1. substitua a imagem
2. ajuste o nome em:

```bash
templates/header.js
```

---

## 💡 Casos de Uso

* Documento de casos de teste
* Evidência para homologação
* Regressão documentada
* Entregas para cliente
* Features em Gherkin
* Histórico de testes por sprint

---

## 🔥 Próximas Evoluções

* Exportar PDF
* Gerar ZIP automático
* Dashboard HTML
* Integração Cypress / Playwright
* Evidência automática pós execução
* Pipeline CI/CD

---

## 🤝 Contribuição

Sugestões e melhorias são bem-vindas.

Faça um fork, melhore e mande PR.

---

## 👨‍💻 Autor

Desenvolvido por **Kleverson Fraga Costa**
QA Analyst | Automação | Processos | Documentação Inteligente

---

## 😏 Resumo sincero

Se você ainda cria documentação manual no Word...

esse projeto veio pra acabar com seu sofrimento.

```
```
