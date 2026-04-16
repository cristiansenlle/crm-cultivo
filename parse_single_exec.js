const fs = require('fs');
const raw = fs.readFileSync('exec_latest.json', 'utf8');

console.log("=== CHAT INPUT ===");
const chatMatch = raw.match(/"chatInput":"(.*?)"/g);
if(chatMatch) console.log(chatMatch);

console.log("\\n=== AI AGENT RESPONSES ===");
const nodeLines = raw.split('"node":"AI Agent');
for(let i=1; i<nodeLines.length; i++) {
   const jsonStr = nodeLines[i].substring(0, 8000);
   const m = jsonStr.match(/"output":"(.*?)"/);
   if(m) console.log("Output Length:", m[1].length, m[1].substring(0, 150));
}

console.log("\\n=== CONSULTAR_SALAS ===");
const salasLines = raw.split('"node":"consultar_salas"');
for(let i=1; i<salasLines.length; i++) {
   const resMatch = salasLines[i].match(/"json":(\[\{.*?\}\])/);
   if(resMatch) console.log("Result:", resMatch[1].substring(0, 200));
}

console.log("\\n=== CONSULTAR_LOTES ===");
const lotesLines = raw.split('"node":"consultar_lotes"');
for(let i=1; i<lotesLines.length; i++) {
   const resMatch = lotesLines[i].match(/"json":(\[\{.*?\}\])/);
   if(resMatch) console.log("Result:", resMatch[1].substring(0, 250));
}
