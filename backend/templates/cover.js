const { Paragraph, TextRun, AlignmentType } = require("docx");
const style = require("../config/style");

function buildCover() {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: style.doc.titulo,
          bold: true,
          size: 56,
          color: style.colors.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 200 }
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: style.doc.subtitulo,
          size: 28
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: style.doc.versao,
          italics: true,
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: style.doc.descricao,
          size: 22
        })
      ],
      alignment: AlignmentType.CENTER
    })
  ];
}

module.exports = { buildCover };