const fs = require('fs');
const raw = fs.readFileSync('exec_88.json', 'utf8');

console.log("=== CHAT INPUT ===");
const chatMatch = raw.match(/"chatInput":"(.*?)"/g);
if(chatMatch) console.log(chatMatch);

console.log("\\n=== AI AGENT TOOLS EXECUTED ===");
// Scan the raw JSON for tool definitions
['consultar_salas', 'cargar_telemetria', 'consultar_salas_groq', 'cargar_telemetria_groq', 'crear_lote'].forEach(tool => {
     const res = raw.split('"node":"' + tool + '"').length - 1;
     console.log(tool, "count:", res);
});

console.log("\\n=== WHICH AI AGENT RAN? ===");
['AI Agent (Function Calling)', 'AI Agent (Groq Fallback)'].forEach(node => {
     const res = raw.split('"node":"' + node + '"').length - 1;
     console.log(node, "count:", res);
});

console.log("\\n=== TELEMETRY PAYLOAD ===");
const teleMatch = raw.match(/"node":"cargar_telemetria(?:.*?)"[^]+?"json":(\{.*?\})/);
if(teleMatch) console.log(teleMatch[1]);
