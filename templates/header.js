const { Header, Paragraph, ImageRun, AlignmentType, BorderStyle } = require("docx");
const fs = require("fs");
const path = require("path");

function buildHeader() {
  const logoPath = path.join(__dirname, "../assets/vivo_logo.png");
  const logo = fs.readFileSync(logoPath);

  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            data: logo,
            transformation: { width: 140, height: 50 }
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },

        //  linha embaixo 
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: "8433AD" 
          }
        }
      })
    ]
  });
}

module.exports = { buildHeader };