const fs = require('fs');

function check() {
    try {
        const nodesStr = fs.readFileSync('patched_ai_workflow_final_v13.json', 'utf8');
        const nodes = JSON.parse(nodesStr);
        
        const aiGroq = nodes.find(n => n.name === 'AI Agent (Groq Fallback)');
        if(aiGroq) {
            console.log("=== GROQ AGENT PROMPT ===");
            console.log(aiGroq.parameters.options.systemMessage);
        } else {
            console.log("NO GROQ AGENT NODE FOUND!");
        }
    } catch(e) {
        console.error(e.message);
    }
}
check();
