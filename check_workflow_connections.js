const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
}).then(async () => {
    // Get connections
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT connections FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    
    if (r.stdout) {
        const conns = JSON.parse(r.stdout);
        
        // Find what tools are connected to AI Agent (Function Calling) 
        // In n8n, tools connect to ai_tool input of the agent
        console.log('=== Connection keys ===');
        console.log(Object.keys(conns).join('\n'));
        
        // Check which nodes connect TO the AI Agent
        const agentName = 'AI Agent (Function Calling)';
        const groqAgentName = 'AI Agent (Groq Fallback)';
        
        // Find all tool connections
        for (const [sourceName, targets] of Object.entries(conns)) {
            if (!targets || !targets.main) continue;
            for (const outputGroup of targets.main) {
                if (!outputGroup) continue;
                for (const conn of outputGroup) {
                    if (conn.node === agentName || conn.node === groqAgentName) {
                        console.log(`\n${sourceName} → ${conn.node} (type: ${conn.type}, index: ${conn.index})`);
                    }
                }
            }
        }
        
        // Also check ai_tool type connections
        for (const [sourceName, targets] of Object.entries(conns)) {
            if (targets.ai_tool) {
                for (const outputGroup of targets.ai_tool) {
                    if (!outputGroup) continue;
                    for (const conn of outputGroup) {
                        console.log(`\n[AI_TOOL] ${sourceName} → ${conn.node} (type: ${conn.type}, index: ${conn.index})`);
                    }
                }
            }
        }
        
        // Find reportar_evento connections specifically
        const reportarConns = conns['reportar_evento'];
        const reportarGroqConns = conns['reportar_evento_groq'];
        console.log('\n=== reportar_evento connections ===');
        console.log(JSON.stringify(reportarConns, null, 2));
        console.log('\n=== reportar_evento_groq connections ===');
        console.log(JSON.stringify(reportarGroqConns, null, 2));
        
        // Check what's connected to the agent's ai_tool input
        console.log('\n=== All connections TO agent nodes ===');
        for (const [sourceName, targets] of Object.entries(conns)) {
            const allTargets = [...(targets.main || []), ...(targets.ai_tool || []), ...(targets.ai_languageModel || []), ...(targets.ai_memory || [])].flat().filter(Boolean);
            for (const conn of allTargets) {
                if (conn.node === agentName || conn.node === groqAgentName) {
                    console.log(`  ${sourceName} → ${conn.node} [type:${conn.type}]`);
                }
            }
        }
    }
    
    ssh.dispose();
}).catch(e => console.error(e));
