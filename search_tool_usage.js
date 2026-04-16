const fs = require('fs');
const raw = fs.readFileSync('recent_execs.txt', 'utf8');

console.log("=== ANY TOOL CARGAR EXECUTIONS ===");
const teleLines = raw.split('"node":"');
if(teleLines.length > 1) {
    for(let i=1; i<teleLines.length; i++) {
        const nodeName = teleLines[i].substring(0, 50).split('"')[0];
        if(nodeName.includes('telemetria') || nodeName.includes('cargar')) {
            console.log('Found suspiciously named tool:', nodeName);
        }
    }
}

// Check if telemetry was called via the groq
console.log("=== AI AGENT MATCHES ===");
const aiLines = raw.split('"node":"AI Agent');
for(let i=1; i<aiLines.length; i++) {
   console.log("AI Agent", aiLines[i].substring(0, 20).split('"')[0]);
}

console.log("=== DB QUERY === ");
// Let's do a fast check in Supabase to confirm the data really arrived precisely when the user said
console.log("Checking Supabase...");

