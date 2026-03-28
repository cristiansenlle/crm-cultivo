const fs = require('fs');
const p = 'c:/Users/Cristian/.gemini/antigravity/crm cannabis/cultivo.html';
let h = fs.readFileSync(p, 'utf8');

// The exact string in the file (per step 3118 output):
const targetRegex = /<div style="display:flex; gap: 10px;">\\s*<div style="flex:2;">/;

if (targetRegex.test(h)) {
    h = h.replace(targetRegex, '<div style="display:flex; gap: 10px; margin-top:5px;">\\n                            <div style="flex:1;">');
    fs.writeFileSync(p, h, 'utf8');
    console.log("PATCHED AND SAVED");
} else {
    console.log("REGEX FAILED. Could not find target pattern.");
}
