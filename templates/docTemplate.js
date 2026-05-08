const { Paragraph, TextRun } = require("docx");

function sectionTitle(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text || "",
        bold: true
      })
    ]
  });
}

function infoBox(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `ℹ️ ${text || ""}`,
        italics: true
      })
    ]
  });
}

function tag(tipo, nome) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${tipo || "default"} - ${nome || ""}`,
        bold: true
      })
    ]
  });
}

// 🔥 SAFE CODEBLOCK (NUNCA QUEBRA WORD)
function codeBlockSafe(lines = []) {
  const safeLines = lines
    .filter(l => typeof l === "string" && l.trim().length > 0);

  if (!safeLines.length) return [];

  return safeLines.map(line =>
    new Paragraph({
      children: [
        new TextRun({
          text: line
        })
      ]
    })
  );
}

module.exports = {
  sectionTitle,
  infoBox,
  tag,
  codeBlockSafe
};