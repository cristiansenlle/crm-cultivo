const fs = require('fs');

function check() {
    try {
        const nodesStr = fs.readFileSync('patched_ai_workflow_final_v13.json', 'utf8');
        const nodes = JSON.parse(nodesStr);
        
        const ai = nodes.find(n => n.name === 'AI Agent (Function Calling)');
        if(ai) {
            console.log("=== AI PROMPT ===");
            console.log(ai.parameters.options.systemMessage);
        }
    } catch(e) {
        console.error(e.message);
    }
}
check();
