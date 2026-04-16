const fs = require('fs');
const htmlPath = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const anchor1 = '                                <select id="cropLocation"';
const anchor2 = '                                </select>';

const startIndex = html.indexOf(anchor1);
const endIndex = html.indexOf(anchor2, startIndex) + anchor2.length;

if (startIndex !== -1 && endIndex !== -1) {
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex);
    
    const replacement = `                                <select id="cropLocation"
                                    style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #444; background: var(--bg-dark); color: white; margin-top:5px;">
                                    <option value="">Cargando salas autorizadas...</option>
                                </select>`;
                                
    html = before + replacement + after;
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log("PATCHED HTML LOCALLY");
} else {
    console.log("Hooks not found");
}
