const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/active_wf_patched.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log(Object.keys(wf.connections).slice(0, 5));
