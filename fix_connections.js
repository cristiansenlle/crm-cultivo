const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

const AGENT_NAME = 'AI Agent (Function Calling)';

// Get all ToolHttpRequest node names
const toolNodes = wf.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.toolHttpRequest');

console.log(`Found ${toolNodes.length} tool nodes total:`);
toolNodes.forEach(t => console.log(`  - ${t.name} (id: ${t.id})`));

let fixed = 0;
let alreadyOk = 0;

toolNodes.forEach(tool => {
    const conn = wf.connections[tool.name];

    const correctConn = {
        "ai_tool": [
            [{ "node": AGENT_NAME, "type": "ai_tool", "index": 0 }]
        ]
    };

    // Check if properly connected with ai_tool key pointing to agent
    const isOk = conn &&
        conn.ai_tool &&
        conn.ai_tool[0] &&
        conn.ai_tool[0][0] &&
        conn.ai_tool[0][0].node === AGENT_NAME;

    if (isOk) {
        console.log(`  ✅ Already connected: ${tool.name}`);
        alreadyOk++;
    } else {
        wf.connections[tool.name] = correctConn;
        console.log(`  🔧 Fixed connection: ${tool.name}`);
        fixed++;
    }
});

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log(`\nDone. Fixed: ${fixed}, Already OK: ${alreadyOk}. Workflow saved.`);
