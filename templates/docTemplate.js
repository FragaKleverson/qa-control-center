const { Paragraph, TextRun, BorderStyle } = require("docx");
const style = require("../config/style");

const { colors, fonts } = style;

function sectionTitle(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        color: "FFFFFF"
      })
    ],
    shading: { fill: colors.primary },
    spacing: { before: 300, after: 200 }
  });
}

function infoBox(text) {
  return new Paragraph({
    children: [new TextRun({ text: `ℹ️ ${text}`, italics: true })],
    shading: { fill: "E3F0FA" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 6, color: colors.info }
    }
  });
}

function tag(tipo, nome) {
  const map = {
    success: { emoji: "✅", color: colors.success, bg: "E8F5E9" },
    error: { emoji: "❌", color: colors.error, bg: "FDECEA" },
    default: { emoji: "🔄", color: colors.info, bg: "E3F0FA" }
  };

  const t = map[tipo] || map.default;

  return new Paragraph({
    children: [
      new TextRun({
        text: `${t.emoji} ${nome}`,
        bold: true,
        color: t.color
      })
    ],
    shading: { fill: t.bg },
    spacing: { before: 200, after: 100 }
  });
}

function codeBlock(lines) {
  return lines.map(line =>
    new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: fonts.code,
          size: 20
        })
      ],
      shading: { fill: colors.background },
      border: {
        left: { style: BorderStyle.SINGLE, size: 6, color: colors.primary }
      }
    })
  );
}

module.exports = {
  sectionTitle,
  infoBox,
  tag,
  codeBlock
};