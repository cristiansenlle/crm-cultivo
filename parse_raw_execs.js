const fs = require('fs');

function parseExecs() {
    try {
        const raw = fs.readFileSync('recent_execs.txt', 'utf8');
        // Simple regex to find the AI Agent JSON blocks in the raw dump
        const lines = raw.split('\n');
        
        let execCount = 0;
        lines.forEach(line => {
            if(!line.includes('|')) return;
            const parts = line.split('|');
            const id = parts[0];
            const time = parts[1];
            console.log(`\n\n=== RUN ID: ${id} at ${time} ===`);
            
            // Just scan the raw text for tool names
            console.log("Did it call consultar_salas?");
            console.log(line.includes('consultar_salas'));

            console.log("Did it call cargar_telemetria?");
            console.log(line.includes('cargar_telemetria'));
            
            // Find what it actually sent to telemetry if it called it
            const telemetryMatch = line.match(/"node":"cargar_telemetria"[^]*?"json":(\{.*?\})/);
            if (telemetryMatch) {
                console.log("Telemetry Payload:", telemetryMatch[1]);
            }
            
            // Find what AI Agent heard
            const aiInMatch = line.match(/"node":"AI Agent \(Function Calling\)"[^]*?"json":(\{.*?"chatInput":".*?"\})/) || line.match(/"chatInput":".*?"/g);
            if (aiInMatch) {
                console.log("AI Input Context:");
                console.log(aiInMatch[0] || aiInMatch);
            }
        });

    } catch(e) {
        console.error(e);
    }
}
parseExecs();
