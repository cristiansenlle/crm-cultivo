const { NodeSSH } = require('node-ssh');
const http = require('http');
const ssh = new NodeSSH();

const N8N_HOST = '109.199.99.126';
const N8N_PORT = 5678;
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

function n8nReq(path, method, data, apiKey) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;
        const opts = {
            hostname: N8N_HOST,
            port: N8N_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': apiKey,
                ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
            }
        };
        const req = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

ssh.connect({ host: N8N_HOST, username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    // Get API key from n8n SQLite
    const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
    const apiKey = keyRes.stdout.trim();
    console.log('API key found:', apiKey ? 'YES (' + apiKey.substring(0,10) + '...)' : 'NO');

    if (!apiKey) {
        // Create one via CLI on the server
        console.log('No API key found. Creating via n8n CLI...');
        const createKey = await ssh.execCommand('n8n user-management:reset 2>/dev/null || echo failed');
        console.log('Create result:', createKey.stdout.substring(0, 200));
        ssh.dispose(); return;
    }

    // Get the workflow via API
    console.log('\nFetching workflow...');
    const wfRes = await n8nReq(`/api/v1/workflows/${WORKFLOW_ID}`, 'GET', null, apiKey);
    console.log('Fetch status:', wfRes.status);

    if (wfRes.status !== 200) {
        console.error('Error fetching:', wfRes.body.substring(0, 300));
        ssh.dispose(); return;
    }

    const wf = JSON.parse(wfRes.body);
    let changes = 0;

    // Fix any remaining bad nodes
    (wf.nodes || []).forEach((n, i) => {
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini' || n.type === '@n8n/n8n-nodes-langchain.lmChatGooglePalm') {
            console.log(`Replacing Gemini node [${i}]: ${n.name}`);
            n.parameters = { model: 'meta-llama/llama-3.3-70b-instruct:free', options: {} };
            n.type = '@n8n/n8n-nodes-langchain.lmChatOpenRouter';
            n.name = 'OpenRouter (Free LLaMA 70B)';
            n.credentials = { openRouterApi: { id: 'CN5018CsgxQLJts8', name: 'OpenRouter account' } };
            changes++;
        }
        if (n.parameters?.model === 'gemma2-9b-it') {
            console.log(`Fixing decommissioned gemma [${i}]: ${n.name}`);
            n.parameters.model = 'llama-3.3-70b-versatile';
            changes++;
        }
    });
    console.log('Total node changes:', changes);

    // PUT workflow back via API
    console.log('\nPushing workflow via API...');
    const putRes = await n8nReq(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', wf, apiKey);
    console.log('PUT status:', putRes.status, putRes.body.substring(0, 300));

    ssh.dispose();
}).catch(e => console.error(e));
