const { Document, Packer, Paragraph, TextRun } = require("docx");

function safe(v) {
  return typeof v === "string" ? v : String(v || "");
}

function title(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: safe(text),
        bold: true,
        size: 36
      })
    ]
  });
}

function label(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true
      })
    ]
  });
}

function empty() {
  return new Paragraph({ text: "" });
}

function separator() {
  return new Paragraph({
    children: [
      new TextRun("────────────────────────────")
    ]
  });
}

function makeId(i) {
  return `CT-${String(i + 1).padStart(3, "0")}`;
}

async function generateDoc(data) {
  const children = [];

  // 📌 TÍTULO
  children.push(title(data.titulo));
  children.push(empty());

  // 📄 INFO
  children.push(label("Descrição"));
  children.push(new Paragraph({ text: safe(data.descricao) }));
  children.push(empty());

  children.push(label("Feature"));
  children.push(new Paragraph({ text: safe(data.feature) }));
  children.push(empty());

  children.push(separator());
  children.push(label("CASOS DE TESTE"));
  children.push(empty());

  if (Array.isArray(data.cenarios)) {
    data.cenarios.forEach((c, i) => {
      if (!c?.nome) return;

      const id = makeId(i);

      // HEADER DO CENÁRIO
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${id} | ${c.nome} | ${c.tipo}`,
              bold: true,
              size: 24
            })
          ]
        })
      );

      children.push(empty());

      // PASSOS (AGORA CORRETO: 1 POR LINHA)
      const passos = Array.isArray(c.passos)
        ? c.passos
        : typeof c.passos === "string"
          ? c.passos.split("\n")
          : [];

      passos
        .filter(Boolean)
        .forEach(p => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${p.trim()}`
                })
              ]
            })
          );
        });

      children.push(empty());
      children.push(separator());
    });
  }

  const doc = new Document({
    sections: [
      {
        children
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);

  return {
    buffer,
    fileName: data.fileName || "qa-document"
  };
}

module.exports = { generateDoc };