const { Document, Packer, Paragraph, PageBreak } = require("docx");
const fs = require("fs");

const historias = require("./data/historias.json");

const { buildHeader } = require("./templates/header");
const { buildCover } = require("./templates/cover");
const { sectionTitle, infoBox, tag, codeBlock } = require("./templates/docTemplate");

async function run() {
  for (const historia of historias) {

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
    historia.cenarios.forEach(c => {
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

    const buffer = await Packer.toBuffer(doc);
    function normalizeFileName(text) {
      return text
        .normalize("NFD")                 // separa acento
        .replace(/[\u0300-\u036f]/g, "")  // remove acento
        .replace(/[^a-zA-Z0-9]/g, "_")    // troca resto por _
        .replace(/_+/g, "_")              // evita ___
        .toLowerCase();
    }
    const fileName = historia.fileName || normalizeFileName(historia.titulo);


    fs.writeFileSync(`./Testes/${fileName}.docx`, buffer);

    console.log(`✔ ${fileName}.docx gerado`);
  }
}

run();