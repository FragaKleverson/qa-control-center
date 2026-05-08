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
    cenarios: [
      {
        nome: "",
        tipo: "Happy Path",
        passos: ""
      }
    ]
  });

  /* 🔥 TOAST */
  const [toast, setToast] = useState("");

  function updateField(field, value) {
    setDoc((prev) => ({ ...prev, [field]: value }));
  }

  function updateScenario(index, field, value) {
    setDoc((prev) => {
      const cenarios = [...prev.cenarios];
      cenarios[index] = { ...cenarios[index], [field]: value };
      return { ...prev, cenarios };
    });
  }

  function addScenario() {
    setDoc((prev) => ({
      ...prev,
      cenarios: [
        ...prev.cenarios,
        { nome: "", tipo: "Happy Path", passos: "" }
      ]
    }));
  }

  function removeScenario(index) {
    setDoc((prev) => ({
      ...prev,
      cenarios: prev.cenarios.filter((_, i) => i !== index)
    }));
  }

  async function saveProject() {
    const res = await fetch("http://localhost:3001/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc)
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    setToast("Projeto salvo com sucesso!");

    setTimeout(() => {
      setToast("");
    }, 3000);
  }

  return (
    <div className="container">

      <div className="header">
        <h1>QA Control Center</h1>
        <p>Test Management & Execution System</p>
      </div>

      {/* FORM PRINCIPAL */}
      <div className="card">
        <input
          placeholder="Título"
          value={doc.titulo}
          onChange={(e) => updateField("titulo", e.target.value)}
        />

        <textarea
          placeholder="Descrição"
          value={doc.descricao}
          onChange={(e) => updateField("descricao", e.target.value)}
        />

        <input
          placeholder="Feature"
          value={doc.feature}
          onChange={(e) => updateField("feature", e.target.value)}
        />
      </div>

      {/* CENÁRIOS */}
      {doc.cenarios.map((c, i) => (
        <div className="card" key={i}>

          <div className="scenarioHeader">
            <h3>Cenário {i + 1}</h3>
          </div>

          <input
            placeholder="Nome do cenário"
            value={c.nome}
            onChange={(e) => updateScenario(i, "nome", e.target.value)}
          />

          <select
            value={c.tipo}
            onChange={(e) => updateScenario(i, "tipo", e.target.value)}
          >
            {categorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <textarea
            placeholder="Given ...
When ...
Then ..."
            value={c.passos}
            onChange={(e) => updateScenario(i, "passos", e.target.value)}
          />

          {doc.cenarios.length > 1 && (
            <button
              className="danger full"
              onClick={() => removeScenario(i)}
            >
              Remover cenário
            </button>
          )}

        </div>
      ))}

      {/* FOOTER FIXO */}
      <div className="footerActions">

        <button className="primary" onClick={addScenario}>
          + cenário
        </button>

        <button className="success" onClick={saveProject}>
          💾 Salvar no banco
        </button>

        <div className="counterBox">
          Total: {doc.cenarios.length}
        </div>

      </div>
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}