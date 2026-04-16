const fs = require('fs');
const raw = fs.readFileSync('recent_execs.txt', 'utf8');

console.log("=== CHAT INPUTS ===");
const lines = raw.split('"chatInput":"');
if(lines.length > 1) {
    for(let i=1; i<lines.length; i++) {
        console.log('->', lines[i].substring(0, 200).split('"')[0]);
    }
}

console.log("\\n=== AI AGENT TOOLS ===");
const nodeLines = raw.split('"node":"');
for(let i=1; i<nodeLines.length; i++) {
    const nodeName = nodeLines[i].substring(0, 50).split('"')[0];
    if(nodeName === 'AI Agent (Function Calling)' || nodeName === 'AI Agent (Groq Fallback)') {
         const jsonStr = nodeLines[i].substring(0, 5000);
         const jsonMatch = jsonStr.match(/"json":(\{.*?\})/);
         if(jsonMatch) {
             const json = JSON.parse(jsonMatch[1]);
             if(json.output && json.output.includes && json.output.includes('sala')) {
                 console.log(`[${nodeName}] -> output:`, json.output.substring(0, 250));
             }
         }
    }
}

console.log("\\n=== CONSULTAR_SALAS EXECUTIONS ===");
const salasLines = raw.split('"node":"consultar_salas"');
console.log("Count:", salasLines.length - 1);

console.log("\\n=== CARGAR_TELEMETRIA EXECUTIONS ===");
const teleLines = raw.split('"node":"cargar_telemetria"');
console.log("Count:", teleLines.length - 1);
if(teleLines.length > 1) {
    for(let i=1; i<teleLines.length; i++) {
        const jsonMatch = teleLines[i].substring(0, 1000).match(/"json":(\{.*?\})/);
        if(jsonMatch) console.log('Payload:', jsonMatch[1]);
    }
}
