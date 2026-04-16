const { NodeSSH } = require('node-ssh');
const https = require('https');
const ssh = new NodeSSH();

const N8N_HOST = '109.199.99.126';
const N8N_PORT = 5678;
const N8N_EMAIL = 'cristiansenlle@gmail.com';
const N8N_PASS = 'Fn@175341';
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

function n8nRequest(path, method, data, cookie) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;
        const opts = {
            hostname: N8N_HOST,
            port: N8N_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { Cookie: cookie } : {}),
                ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
            }
        };
        const req = https.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// Use HTTP not HTTPS since n8n is on plain HTTP
function n8nReq(path, method, data, cookie) {
    return new Promise((resolve, reject) => {
        const http = require('http');
        const body = data ? JSON.stringify(data) : null;
        const opts = {
            hostname: N8N_HOST,
            port: N8N_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { Cookie: cookie } : {}),
                ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
            }
        };
        const req = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function main() {
    // 1. Login to n8n
    console.log('Logging into n8n...');
    const loginRes = await n8nReq('/rest/login', 'POST', { email: N8N_EMAIL, password: N8N_PASS });
    console.log('Login status:', loginRes.status);
    
    const setCookie = loginRes.headers['set-cookie'];
    const cookie = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
    console.log('Cookie:', cookie.substring(0, 60));

    // 2. Get current workflow to read its full JSON
    console.log('\nFetching workflow...');
    const wfRes = await n8nReq(`/rest/workflows/${WORKFLOW_ID}`, 'GET', null, cookie);
    console.log('Workflow fetch status:', wfRes.status);
    
    if (wfRes.status !== 200) {
        console.error('Failed to get workflow:', wfRes.body.substring(0, 300));
        return;
    }
    
    const wf = JSON.parse(wfRes.body);
    const data = wf.data || wf;
    
    // 3. Find and fix any remaining bad model references
    let changes = [];
    (data.nodes || []).forEach((n, i) => {
        // Fix any remaining Gemini PaLM nodes
        if (n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini' || n.type === '@n8n/n8n-nodes-langchain.lmChatGooglePalm') {
            changes.push(`[${i}] ${n.name}: replacing broken Gemini node → OpenRouter free`);
            n.parameters = { model: 'meta-llama/llama-3.3-70b-instruct:free', options: {} };
            n.type = '@n8n/n8n-nodes-langchain.lmChatOpenRouter';
            n.name = 'OpenRouter (Free LLaMA 70B)';
            n.credentials = { openRouterApi: { id: 'CN5018CsgxQLJts8', name: 'OpenRouter account' } };
        }
        // Fix decommissioned gemma model
        if (n.parameters?.model === 'gemma2-9b-it') {
            changes.push(`[${i}] ${n.name}: gemma2-9b-it → llama-3.3-70b-versatile`);
            n.parameters.model = 'llama-3.3-70b-versatile';
        }
    });
    
    console.log('\nChanges:', changes.length ? changes : 'None needed');
    
    // 4. PUT the updated workflow back via API (forces n8n to reload from the payload)
    console.log('\nUpdating workflow via API...');
    const updateRes = await n8nReq(`/rest/workflows/${WORKFLOW_ID}`, 'PUT', data, cookie);
    console.log('Update status:', updateRes.status);
    if (updateRes.status !== 200) {
        console.error('Error:', updateRes.body.substring(0, 400));
    } else {
        console.log('Success! n8n reloaded workflow from API.');
    }
    
    // 5. Activate the workflow via API
    const activateRes = await n8nReq(`/rest/workflows/${WORKFLOW_ID}/activate`, 'POST', {}, cookie);
    console.log('Activate status:', activateRes.status);
}

main().catch(console.error);
