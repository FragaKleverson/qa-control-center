const { Document, Packer, Paragraph, PageBreak } = require("docx");

const { buildHeader } = require("../../templates/header");
const { buildCover } = require("../../templates/cover");
const { sectionTitle, infoBox, tag, codeBlock } = require("../../templates/docTemplate");

function normalizeFileName(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

async function generateDoc(historia) {
  const children = [];

  // CAPA
  children.push(...buildCover());
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // HISTÓRIA
  children.push(sectionTitle(`📌 ${historia.titulo}`));
  children.push(infoBox(historia.descricao));

  // Feature
  children.push(...codeBlock([`Feature: ${historia.feature}`]));

  // Background
  if (historia.background) {
    children.push(...codeBlock([
      "",
      "Background:",
      ...historia.background
    ]));
  }

  // Cenários
  (historia.cenarios || []).forEach(c => {
    children.push(tag(c.tipo, c.nome));

    children.push(...codeBlock([
      `Scenario: ${c.nome}`,
      ...c.passos
    ]));
  });

  const doc = new Document({
    sections: [{
      headers: { default: buildHeader() },
      children
    }]
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    return { buffer, fileName };
  } catch (err) {
    throw new Error("Erro ao gerar DOCX");
  }
  return {
    buffer,
    fileName: historia.fileName || normalizeFileName(historia.titulo)
  };
}

module.exports = { generateDoc };