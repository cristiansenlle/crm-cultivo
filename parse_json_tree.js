const fs = require('fs');

function parseNode() {
    try {
        const raw = fs.readFileSync('clean_e98.json', 'utf8');
        const data = JSON.parse(raw);
        
        // Find the AI Agent node execution
        for (let key in data.data.resultData.runData) {
            if (key.includes('AI Agent')) {
                const runs = data.data.resultData.runData[key];
                runs.forEach((run, idx) => {
                    console.log(`\\n=== AI AGENT RUN ${idx} ===`);
                    if(run.data && run.data.main && run.data.main[0]) {
                        const items = run.data.main[0];
                        items.forEach(item => {
                            if(item.json && item.json.output) {
                                console.log("\\n[AI OUTPUT TEXT]:\\n" + item.json.output);
                            }
                            if(item.json && item.json.toolCalls) {
                                console.log("\\n[AI TOOL CALLS]:");
                                console.log(JSON.stringify(item.json.toolCalls, null, 2));
                            }
                        });
                    }
                    if(run.error) {
                         console.log("\\n[AI ERROR]:", run.error.message);
                    }
                });
            }
            if (key.includes('cargar_telemetria')) {
                const runs = data.data.resultData.runData[key];
                runs.forEach((run, idx) => {
                    console.log(`\\n=== CARGAR_TELEMETRIA RUN ${idx} ===`);
                    if(run.error) {
                        console.log("\\n[TELEMETRIA ERROR]:", run.error.message, JSON.stringify(run.error, null, 2));
                    }
                    if(run.data && run.data.main && run.data.main[0]) {
                         console.log("\\n[TELEMETRIA SUCCESS DATA]:", JSON.stringify(run.data.main[0], null, 2).substring(0, 500));
                    }
                });
            }
        }

    } catch(e) { console.error("Parse Error:", e); }
}
parseNode();
