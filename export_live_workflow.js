const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';
const DATE = '2026-03-28';
const FILENAME = `n8n-crm-cannabis-workflow-OPENROUTER-FREE-${DATE}.json`;

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    // Get API key from SQLite
    const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
    const apiKey = keyRes.stdout.trim();
    console.log('API key:', apiKey ? 'found' : 'NOT FOUND');

    if (!apiKey) { ssh.dispose(); return; }

    // Fetch full workflow via API
    const wfRes = await ssh.execCommand(
        `curl -s http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKey}"`
    );

    const wf = JSON.parse(wfRes.stdout);
    console.log('Workflow name:', wf.name);
    console.log('Active:', wf.active);
    console.log('Total nodes:', wf.nodes?.length);

    // Verify no Gemini nodes
    const geminiNodes = (wf.nodes || []).filter(n =>
        n.type?.includes('Gemini') || n.type?.includes('GooglePalm') || n.name?.includes('Gemini')
    );
    console.log('Gemini nodes (should be 0):', geminiNodes.length);

    // Show LLM nodes for confirmation
    const llmNodes = (wf.nodes || []).filter(n => n.type?.includes('lmChat'));
    llmNodes.forEach(n => console.log(`  ✓ ${n.name}: ${n.parameters?.model || n.parameters?.modelName}`));

    // Save with pretty formatting for easy review
    fs.writeFileSync(FILENAME, JSON.stringify(wf, null, 2));
    console.log(`\nSaved: ${FILENAME}`);

    ssh.dispose();
}).catch(e => console.error(e));
