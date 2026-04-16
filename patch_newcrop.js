const fs = require('fs');
const p = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';
let lines = fs.readFileSync(p, 'utf8').split(/\\r?\\n/);

let idx = lines.findIndex(l => l.includes('<div style="flex:2;">') && l.includes('class') === false);

if (idx > -1 && lines[idx - 1].includes('gap: 10px;')) {
    lines[idx - 1] = '                        <div style="display:flex; gap: 10px; margin-top:5px;">';
    lines[idx]     = '                            <div style="flex:1;">';
    console.log("PATCHED!");
} else {
    console.log("NOT FOUND or idx wrong", idx);
}

fs.writeFileSync(p, lines.join('\\n'), 'utf8');
