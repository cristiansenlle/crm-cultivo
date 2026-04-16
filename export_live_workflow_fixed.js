const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';
const DATE = '2026-03-28';
const FILENAME = `n8n-crm-cannabis-TOKENS-FIXED-${DATE}.json`;

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
    const apiKey = keyRes.stdout.trim();

    if (!apiKey) { console.error('API key NOT FOUND'); ssh.dispose(); return; }

    const wfRes = await ssh.execCommand(
        `curl -s http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKey}"`
    );

    const wf = JSON.parse(wfRes.stdout);
    
    // Quick verification
    console.log('Workflow:', wf.name);
    console.log('Total nodes:', wf.nodes?.length);
    let ok = true;
    wf.nodes?.forEach(n => {
        if(n.type && n.type.includes('lmChat')) {
            if(n.parameters?.options?.maxTokens !== 1024) ok = false;
        }
        if(n.type && n.type.includes('memoryBufferWindow')) {
            if(n.parameters?.k !== 4) ok = false;
        }
    });
    console.log('Verification token limits maxTokens=1024, context=4:', ok ? 'PASS ✅' : 'FAIL ❌');

    fs.writeFileSync(FILENAME, JSON.stringify(wf, null, 2));
    console.log(`\nSaved: ${FILENAME}`);

    ssh.dispose();
}).catch(e => console.error(e));
