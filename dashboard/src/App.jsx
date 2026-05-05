import { useState } from "react";
import "./App.css";

export default function App() {
  const categorias = [
    "Happy Path",
    "Sad Path",
    "Edge Case",
    "Validation",
    "Regression",
    "Integration",
    "Security",
    "Smoke Test"
  ];

  const [doc, setDoc] = useState({
    titulo: "",
    descricao: "",
    feature: "",
    fileName: "",
    cenarios: [
      {
        nome: "",
        tipo: "Happy Path",
        passos: "Given ...\nWhen ...\nThen ..."
      }
    ]
  });

  function updateField(field, value) {
    setDoc({ ...doc, [field]: value });
  }

  function updateScenario(index, field, value) {
    const list = [...doc.cenarios];
    list[index][field] = value;
    setDoc({ ...doc, cenarios: list });
  }

  function addScenario() {
    setDoc({
      ...doc,
      cenarios: [
        ...doc.cenarios,
        {
          nome: "",
          tipo: "Happy Path",
          passos: ""
        }
      ]
    });
  }

  function removeScenario(index) {
    const list = doc.cenarios.filter((_, i) => i !== index);
    setDoc({ ...doc, cenarios: list });
  }

  async function exportDocx() {
    const response = await fetch("http://localhost:3001/api/generate-doc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...doc,
        cenarios: doc.cenarios.map(c => ({
          ...c,
          passos: c.passos.split("\n").filter(Boolean)
        }))
      })
    });

    const blob = await response.blob();

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${doc.fileName || "documento"}.docx`;
    link.click();
  }

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${doc.fileName || "historias"}.json`;
  link.click();
}

return (
  <div className="container">
    <div className="header">
      <div className="brand">
        <div className="logoMini">Q</div>

        <div className="headerCenter">
          <h1>QA Doc Builder</h1>
          <p>Create test docs faster.</p>
        </div>
      </div>
    </div>

    <div className="card">
      <h2>Dados Gerais</h2>

      <input
        placeholder="Título"
        value={doc.titulo}
        onChange={(e) => updateField("titulo", e.target.value)}
      />

      <textarea
        rows="4"
        placeholder="Descrição"
        value={doc.descricao}
        onChange={(e) => updateField("descricao", e.target.value)}
      />

      <input
        placeholder="Feature"
        value={doc.feature}
        onChange={(e) => updateField("feature", e.target.value)}
      />

      <input
        placeholder="Nome do arquivo"
        value={doc.fileName}
        onChange={(e) => updateField("fileName", e.target.value)}
      />
    </div>

    {doc.cenarios.map((cenario, index) => (
      <div className="card scenario" key={index}>
        <div className="scenarioTop">
          <h3>Cenário {index + 1}</h3>

          {doc.cenarios.length > 1 && (
            <button
              className="danger"
              onClick={() => removeScenario(index)}
            >
              Remover
            </button>
          )}
        </div>

        <input
          placeholder="Nome do cenário"
          value={cenario.nome}
          onChange={(e) =>
            updateScenario(index, "nome", e.target.value)
          }
        />

        <select
          value={cenario.tipo}
          onChange={(e) =>
            updateScenario(index, "tipo", e.target.value)
          }
        >
          {categorias.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <textarea
          rows="6"
          placeholder="Passos do cenário"
          value={cenario.passos}
          onChange={(e) =>
            updateScenario(index, "passos", e.target.value)
          }
        />
      </div>
    ))}

    <div className="footerActions">
      <div className="counterBox">
        Cenários criados: <strong>{doc.cenarios.length}</strong>
      </div>

      <button className="primary" onClick={addScenario}>
        + Novo Cenário
      </button>

      <button className="success" onClick={exportJson}>
        Exportar JSON
      </button>
    </div>
  </div>
);
