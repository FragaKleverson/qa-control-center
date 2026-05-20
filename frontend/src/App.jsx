import { useState, useRef } from "react";
import "./App.css";


export default function App() {

  const [loading, setLoading] = useState(false);
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
  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState({
    message: "",
    type: ""
  });

  function showToast(message, type = "info") {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, type });

    toastTimerRef.current = setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 3000);
  }

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

    const hasEmptyScenario = doc.cenarios.some((cenario) => {
      return (
        !cenario.nome.trim() ||
        !cenario.tipo.trim() ||
        !cenario.passos.trim()
      );
    });

    if (
      !doc.titulo.trim() ||
      !doc.descricao.trim() ||
      !doc.feature.trim() ||
      hasEmptyScenario
    ) {
      showToast("Preencha todos os campos obrigatórios dos cenários", "warning");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc)
      });

      if (!res.ok) {
        showToast(await res.text(), "error");
        return;
      }

      const data = await res.json();
      console.log("✅ SALVO:", data);

      showToast("Projeto salvo com sucesso!", "success");

      setDoc({
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

    } catch (error) {
      console.error("❌ ERRO:", error);
      showToast("Erro ao salvar projeto", "error");
    }
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

        <button className="success" onClick={saveProject} disabled={loading}>
          {loading ? "Salvando..." : "💾 Salvar no banco"}
        </button>

        <div className="counterBox">
          Total: {doc.cenarios.length}
        </div>

      </div>
      {toast.message && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}