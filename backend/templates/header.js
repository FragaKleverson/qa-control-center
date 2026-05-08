const { Header, Paragraph, TextRun, AlignmentType } = require("docx");

function buildHeaderSafe() {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "QA DOC BUILDER",
            bold: true
          })
        ],
        alignment: AlignmentType.CENTER
      })
    ]
  });
}

module.exports = { buildHeaderSafe };