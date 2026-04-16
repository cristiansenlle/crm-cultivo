const fs = require('fs');
const htmlPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';
const tempPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/temp_html.txt';

let html = fs.readFileSync(htmlPath, 'utf8');
let replacement = fs.readFileSync(tempPath, 'utf8');

const tStart = '<div class="emergency-overlay" id="modal-edit-batch"';
const tEnd = 'onclick="confirmEditBatch()">Guardar Cambios</button>';

let sIdx = html.indexOf(tStart);
let eIdx = html.indexOf(tEnd, sIdx);

if (sIdx > -1 && eIdx > -1) {
    let fullEndIdx = html.indexOf('</div>', eIdx);
    fullEndIdx = html.indexOf('</div>', fullEndIdx + 1) + 6;

    const resultHtml = html.substring(0, sIdx) + replacement + html.substring(fullEndIdx);
    fs.writeFileSync(htmlPath, resultHtml, 'utf8');
    console.log("SUCCESS");
} else {
    console.log("START OR END NOT FOUND", {sIdx, eIdx});
}
