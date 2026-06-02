const express = require("express");
const router = express.Router();
const { reportsService } = require("../services");
const { Document, Packer, Paragraph, TextRun } = require("docx");

// GET - Listar todos os relatórios/execuções
router.get("/", async (req, res, next) => {
  try {
    const reports = await reportsService.listAll();
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

// POST - Gerar relatório com filtros (JSON)
router.post("/generate", async (req, res) => {
  try {
    const report = await reportsService.generateReport(req.body);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// POST - Exportar relatório como .docx
router.post("/export", async (req, res) => {
  try {
    const report = await reportsService.generateReport(req.body);
    const { summary, executions } = report;

    const children = [];

    const h1    = (text) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 52 })] });
    const h2    = (text) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 36 })] });
    const h3    = (text) => new Paragraph({ children: [new TextRun({ text, bold: true, size: 28 })] });
    const line  = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, size: 24, ...opts })] });
    const blank = () => new Paragraph({ text: "" });
    const sep   = () => new Paragraph({ children: [new TextRun({ text: "─".repeat(60), color: "CCCCCC", size: 20 })] });

    const statusIcon = (s) =>
      s === "passed" ? "✅" : s === "failed" ? "❌" : s === "blocked" ? "⛔" : s === "skipped" ? "⏭" : "⏳";

    // ── Cabeçalho ─────────────────────────────────────────────
    children.push(h1("QA Control Center — Relatório de Execuções"));
    children.push(blank());
    children.push(line(`Gerado em: ${new Date().toLocaleString("pt-BR")}`));
    if (req.body.startDate || req.body.endDate) {
      const range = [req.body.startDate, req.body.endDate].filter(Boolean).join(" → ");
      children.push(line(`Período: ${range}`));
    }
    children.push(blank());
    children.push(sep());

    // ── Resumo ────────────────────────────────────────────────
    children.push(h2("📊 Resumo Geral"));
    children.push(blank());
    children.push(line(`Total de execuções: ${summary.total}`));
    children.push(line(`  ✅ Passed: ${summary.passed}   ❌ Failed: ${summary.failed}   ⏳ Pending: ${summary.pending}`));
    children.push(line(`  Taxa de sucesso: ${summary.successRate}%`));
    children.push(blank());

    if (summary.testCases && summary.testCases.total > 0) {
      const tc = summary.testCases;
      children.push(line(`Total de test cases: ${tc.total}`));
      children.push(line(`  ✅ Passed: ${tc.passed}   ❌ Failed: ${tc.failed}   ⛔ Blocked: ${tc.blocked}   ⏭ Skipped: ${tc.skipped}   ⏳ Pending: ${tc.pending}`));
      children.push(blank());
    }
    children.push(sep());

    // ── Execuções ─────────────────────────────────────────────
    if (executions.length === 0) {
      children.push(line("Nenhuma execução encontrada com os filtros aplicados."));
    } else {
      executions.forEach((ex, i) => {
        children.push(h2(`Execução #${i + 1}  (ID: ${ex.id})`));
        children.push(blank());
        children.push(line(`Status: ${statusIcon(ex.status)} ${ex.status}   |   Ambiente: ${ex.ambiente}`));
        children.push(line(`Data: ${new Date(ex.created_at).toLocaleString("pt-BR")}`));
        if (ex.resultado) children.push(line(`Resultado: ${ex.resultado}`));
        children.push(blank());

        const cases = ex.testCases || [];
        if (cases.length === 0) {
          children.push(line("  Nenhum test case registrado nesta execução."));
        } else {
          children.push(h3(`Casos de Teste (${cases.length})`));
          children.push(blank());

          // Cabeçalho da tabela (simulado com texto tabelado)
          children.push(new Paragraph({
            children: [
              new TextRun({ text: padCol("ID",    6), bold: true, size: 22, font: "Courier New" }),
              new TextRun({ text: padCol("Título",40), bold: true, size: 22, font: "Courier New" }),
              new TextRun({ text: padCol("Status",10), bold: true, size: 22, font: "Courier New" }),
            ]
          }));
          children.push(new Paragraph({
            children: [new TextRun({ text: "─".repeat(58), size: 20, font: "Courier New", color: "999999" })]
          }));

          cases.forEach((c) => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: padCol(`#${c.projeto_id}`, 6), size: 22, font: "Courier New" }),
                new TextRun({ text: padCol(c.titulo || "—", 40), size: 22, font: "Courier New" }),
                new TextRun({ text: `${statusIcon(c.status)} ${c.status}`, size: 22, font: "Courier New" }),
              ]
            }));
            if (c.comentario) {
              children.push(line(`       Obs: ${c.comentario}`, { color: "888888", size: 20 }));
            }
          });
        }

        children.push(blank());
        children.push(sep());
      });
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    const fileName = `qa-report-${new Date().toISOString().slice(0, 10)}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Utilitário: padding fixo para simular coluna em fonte monospace
function padCol(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(0, width - 1) + " " : s + " ".repeat(width - s.length);
}

module.exports = router;
