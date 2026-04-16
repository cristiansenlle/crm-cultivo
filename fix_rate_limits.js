const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {
    
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    const nodes = JSON.parse(r.stdout);
    
    // 1. Switch Groq model to gemma2-9b-it (15,000 TPM free — highest on Groq)
    const groqLLMIdx = nodes.findIndex(n => n.type === '@n8n/n8n-nodes-langchain.lmChatGroq');
    if (groqLLMIdx !== -1) {
        const old = nodes[groqLLMIdx].parameters.model;
        nodes[groqLLMIdx].parameters.model = 'gemma2-9b-it';
        console.log(`Groq model: ${old} → gemma2-9b-it`);
    }

    // 2. Find the Groq Fallback AI Agent and compress its system prompt
    const groqAgentIdx = nodes.findIndex(n => n.name === 'AI Agent (Groq Fallback)');
    if (groqAgentIdx !== -1) {
        const current = nodes[groqAgentIdx].parameters?.options?.systemMessage || '';
        console.log('Current Groq prompt length:', current.length, 'chars');
        
        // Compact version — keeps all functional instructions but cuts verbose formatting
        // Just reference to the main agent behavior to save tokens
        const compactPrompt = `Sos el Agente CRM Cannabis 360 OS (fallback). Respondé en español de Argentina. Sé conciso y profesional.

⚠️ CRÍTICO: Cuando el usuario confirma, ejecutá el tool inmediatamente sin mostrar JSON. Responde solo "✅ Registrado." si OK.

INTEGRIDAD DE DATOS:
• Usá SIEMPRE IDs exactos de lotes (consultar consultar_lotes_groq si no los tenés).
• Usá SIEMPRE UUIDs de salas de consultar_salas_groq.
• NUNCA inventes IDs ni nombres.

APLICACIONES DE INSUMOS (tool: reportar_evento_groq):
• batches: array JSON de IDs de lotes, ej: ["Planta Madre NP/1/2025","Planta madre NP/2/2025"]
• inputs: array JSON, ej: [{"name":"Alga a Mic","qty":6}]
• water_liters: número decimal total de litros de agua
• event_type: "Nutricion", "Prevencion", "Aplicacion", "Plaga", "Poda", "Fase" o "Info"
• raw_description: descripción libre del evento

FLUJO OBLIGATORIO al registrar aplicación:
1. Ejecutar consultar_lotes_groq (silenciosamente)
2. Ejecutar reportar_evento_groq con arrays JSON estructurados
`;
        
        nodes[groqAgentIdx].parameters.options.systemMessage = compactPrompt;
        console.log('Groq agent prompt compressed:', current.length, '→', compactPrompt.length, 'chars');
    }

    // Save and upload
    const fs = require('fs');
    fs.writeFileSync('nodes_fixed_rateLimits.json', JSON.stringify(nodes));
    await ssh.putFile('nodes_fixed_rateLimits.json', '/tmp/nodes_fixed.json');

    const py = `
import sqlite3
with open('/tmp/nodes_fixed.json') as f: nodes = f.read()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE workflow_entity SET nodes=? WHERE id='scpZdPe5Cp4MG98G'", [nodes])
conn.commit()
print('Updated', conn.total_changes, 'row(s)')
conn.close()
`;
    await ssh.execCommand(`cat > /tmp/fix_rate_limits.py << 'PYEOF'\n${py}\nPYEOF`);
    const pyRes = await ssh.execCommand('python3 /tmp/fix_rate_limits.py');
    console.log(pyRes.stdout.trim());
    
    await ssh.execCommand('pm2 restart n8n-service');
    console.log('n8n restarted ✓');

    ssh.dispose();
}).catch(e => console.error(e));
