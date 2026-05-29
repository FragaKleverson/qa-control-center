import { useState, useRef } from "react";
import "./TestCases.css";

export default function TestCases() {
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
    setLoading(true);

    const hasEmptyScenario = doc.cenarios.some((c) => {
      return !c.nome.trim() || !c.tipo.trim() || !c.passos.trim();
    });

    if (
      !doc.titulo.trim() ||
      !doc.descricao.trim() ||
      !doc.feature.trim() ||
      hasEmptyScenario
    ) {
      showToast("Preenche tudo direito aí", "warning");
      setLoading(false);
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
        setLoading(false);
        return;
      }

      await res.json();

      showToast("Salvo com sucesso", "success");

      setDoc({
        titulo: "",
        descricao: "",
        feature: "",
        cenarios: [
          { nome: "", tipo: "Happy Path", passos: "" }
        ]
      });

    } catch (err) {
      console.error(err);
      showToast("Erro na API", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">

      <div className="header">
        <h1>QA Control Center</h1>
        <p>Test Management & Execution System</p>
      </div>

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

      {doc.cenarios.map((c, i) => (
        <div className="card" key={i}>

          <h3>Cenário {i + 1}</h3>

          <input
            placeholder="Nome"
            value={c.nome}
            onChange={(e) => updateScenario(i, "nome", e.target.value)}
          />

          <select
            value={c.tipo}
            onChange={(e) => updateScenario(i, "tipo", e.target.value)}
          >
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Given / When / Then"
            value={c.passos}
            onChange={(e) => updateScenario(i, "passos", e.target.value)}
          />

          {doc.cenarios.length > 1 && (
            <button onClick={() => removeScenario(i)}>
              Remover
            </button>
          )}
        </div>
      ))}

      <div className="footerActions">

        <button onClick={addScenario}>
          + cenário
        </button>

        <button onClick={saveProject} disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </button>

        <span>Total: {doc.cenarios.length}</span>
      </div>

      {toast.message && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}