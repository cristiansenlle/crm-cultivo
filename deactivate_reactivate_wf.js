const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {

    // Get the API key we just created
    const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
    const apiKey = keyRes.stdout.trim();
    console.log('API key:', apiKey ? apiKey.substring(0, 15) + '...' : 'NOT FOUND');

    if (!apiKey) { ssh.dispose(); return; }

    // Deactivate the workflow to stop webhook listeners in memory
    console.log('\nDeactivating workflow...');
    const deact = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/deactivate -H "X-N8N-API-KEY: ${apiKey}" -w " HTTP:%{http_code}"`);
    console.log('Deactivate result:', deact.stdout.slice(-20));

    // Small pause
    await new Promise(r => setTimeout(r, 2000));

    // Re-activate — this forces n8n to reload the workflow from SQLite
    console.log('\nReactivating workflow...');
    const react = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID}/activate -H "X-N8N-API-KEY: ${apiKey}" -w " HTTP:%{http_code}"`);
    console.log('Activate result:', react.stdout.slice(-20));

    // Verify the active workflow now has OpenRouter node instead of Gemini
    console.log('\nVerifying live nodes...');
    const wfCheck = await ssh.execCommand(`curl -s http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKey}"`);
    const wf = JSON.parse(wfCheck.stdout);
    const llmNodes = (wf.nodes || []).filter(n => n.type && n.type.includes('lmChat'));
    llmNodes.forEach(n => console.log(`  ${n.name}: ${n.type} | model: ${n.parameters?.model || n.parameters?.modelName}`));

    ssh.dispose();
}).catch(e => console.error(e));
