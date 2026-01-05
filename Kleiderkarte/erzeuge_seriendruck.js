// Dieses Skript liest die Auswertungs-JSON und erzeugt ein HTML für den Seriendruck auf DIN-A5
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('firemanager_kleiderkammer_auswertung.json', 'utf8'));

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(tag) {
    const charsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return charsToReplace[tag] || tag;
  });
}

const htmlHeader = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Kleiderkarte Seriendruck</title>
  <style>
    @media print {
      .a5page { width: 148mm; height: 210mm; page-break-after: always; box-sizing: border-box; padding: 10mm; border: none !important; }
    }
    .a5page { width: 148mm; height: 210mm; border: 1px solid #aaa; margin: 10px auto; box-sizing: border-box; padding: 10mm; font-family: Arial, sans-serif; background: #fff; }
    h2 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; line-height: 1.6; }
    th { background: #eee;  }
    .meta { margin-bottom: 20px; }
    .meta div { margin-bottom: 15px; }
  </style>
</head>
<body>
`;

const htmlFooter = `</body>\n</html>\n`;

let htmlBody = '';

data.forEach(member => {
  htmlBody += `<div class="a5page">\n`;
  htmlBody += `<h2>Kleiderkarte</h2>\n`;
  htmlBody += `<div class="meta">\n`;
  htmlBody += `<div><strong>Name:</strong> ${escapeHtml(member.name)}</div>\n`;
  htmlBody += `<div><strong>Mitglieds-ID:</strong> ${escapeHtml(member.id)}</div>\n`;
  htmlBody += `<div><strong>Spindnummer:</strong> ${escapeHtml(member.platzNr || '')}</div>\n`;
  htmlBody += `</div>\n`;
  htmlBody += `<table>\n<thead>\n<tr><th>Bezeichnung</th><th>Seriennummer</th><th>Größe</th></tr>\n</thead>\n<tbody>\n`;
  (member.details || []).forEach(item => {
    htmlBody += `<tr><td>${escapeHtml(item.bezeichnung)}</td><td>${escapeHtml(item.seriennummer)}</td><td>${escapeHtml(item.groesse)}</td></tr>\n`;
  });
  htmlBody += `</tbody>\n</table>\n`;
  htmlBody += `</div>\n`;
});

fs.writeFileSync('firemanager_kleiderkammer_seriendruck.html', htmlHeader + htmlBody + htmlFooter);
console.log('Seriendruck-HTML wurde erzeugt: firemanager_kleiderkammer_seriendruck.html');
