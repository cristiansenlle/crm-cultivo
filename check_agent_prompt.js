const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'HIDDEN_SECRET_BY_AI'
}).then(async () => {
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    
    if (r.stdout) {
        const nodes = JSON.parse(r.stdout);
        
        // Find the AI Agent node(s) — look for system prompts
        const agentNodes = nodes.filter(n => 
            n.type && (
                n.type.includes('agent') || 
                n.type.includes('Agent') || 
                n.type.includes('openAi') ||
                n.type.includes('lmChatGroq') ||
                n.type.includes('chainLlm')
            )
        );
        
        agentNodes.forEach(n => {
            console.log(`\n=== ${n.name} (${n.type}) ===`);
            const params = n.parameters || {};
            // Check for system message / prompt
            if (params.text) console.log('TEXT:', params.text.substring(0, 500));
            if (params.systemMessage) console.log('SYSTEM MSG:', params.systemMessage.substring(0, 500));
            if (params.options?.systemMessage) console.log('OPT SYSTEM MSG:', params.options.systemMessage.substring(0, 500));
            if (params.messages) console.log('MESSAGES:', JSON.stringify(params.messages).substring(0, 500));
            if (params.prompt) console.log('PROMPT:', params.prompt.substring(0, 500));
        });
        
        // Also find the actual agent orchestrator
        const orchestrators = nodes.filter(n => n.type && n.type.includes('agent'));
        orchestrators.forEach(n => {
            console.log(`\n=== ORCHESTRATOR: ${n.name} (${n.type}) ===`);
            console.log(JSON.stringify(n.parameters, null, 2).substring(0, 2000));
        });
    }
    
    ssh.dispose();
}).catch(e => console.error(e));
