const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const N8N_HOST = '109.199.99.126';
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: N8N_HOST, username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    // Step 1: Setup n8n user via the setup endpoint (only needed when users table is empty)
    console.log('=== Setting up n8n user ===');
    const setupRes = await ssh.execCommand(`curl -s -c /tmp/n8n_cookie.txt -X POST http://127.0.0.1:5678/rest/owner/setup -H 'Content-Type: application/json' -d '{"email":"cristiansenlle@gmail.com","firstName":"Cristian","lastName":"Senlle","password":"Fn@175341"}' -w " HTTP:%{http_code}"`);
    console.log('Setup:', setupRes.stdout.substring(0, 200));

    // Step 2: Login properly using emailOrLdapLoginId
    console.log('\n=== Login ===');
    const loginRes = await ssh.execCommand(`curl -s -c /tmp/n8n_cookie.txt -b /tmp/n8n_cookie.txt -X POST http://127.0.0.1:5678/rest/login -H 'Content-Type: application/json' -d '{"emailOrLdapLoginId":"cristiansenlle@gmail.com","password":"Fn@175341"}' -w " HTTP:%{http_code}"`);
    console.log('Login:', loginRes.stdout.substring(0, 300));

    // Step 3: Get CSRF token
    const csrfRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT key, value FROM settings WHERE key='userManagement.isInstanceOwnerSetUp' OR key='n8n.encryption.key' LIMIT 5;\"");
    console.log('Settings:', csrfRes.stdout);

    // Step 4: Fetch the workflow with session
    const wfFetch = await ssh.execCommand(`curl -s -b /tmp/n8n_cookie.txt http://127.0.0.1:5678/rest/workflows/${WORKFLOW_ID} -w " HTTP:%{http_code}"`);
    console.log('\nWF Fetch:', wfFetch.stdout.slice(-20));

    // Step 5: Create an API key directly in SQLite (simpler than UI)
    const { randomBytes } = require('crypto');
    const apiKeyId = randomBytes(8).toString('hex');
    const apiKeyValue = 'n8n_api_' + randomBytes(24).toString('hex');
    
    console.log('\n=== Creating API Key in SQLite ===');
    
    // Get user ID first
    const userId = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT id FROM user LIMIT 1;\"");
    console.log('User ID:', userId.stdout.trim());
    
    const createKeySQL = `sqlite3 /root/.n8n/database.sqlite "INSERT OR REPLACE INTO user_api_keys (id, userId, label, apiKey, createdAt, updatedAt) VALUES ('${apiKeyId}', '${userId.stdout.trim()}', 'auto-key', '${apiKeyValue}', datetime('now'), datetime('now'));"`;
    const keyCreate = await ssh.execCommand(createKeySQL);
    console.log('Create key result:', keyCreate.stdout, keyCreate.stderr);

    // Test the API key
    const testKey = await ssh.execCommand(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKeyValue}"`);
    console.log('API key test:', testKey.stdout);

    if (testKey.stdout === '200') {
        // Fetch and update workflow in one shot
        const fetchWF = await ssh.execCommand(`curl -s http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKeyValue}"`);
        const wf = JSON.parse(fetchWF.stdout);
        
        let changes = 0;
        (wf.nodes || []).forEach(n => {
            if (n.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini' || n.type === '@n8n/n8n-nodes-langchain.lmChatGooglePalm') {
                n.parameters = { model: 'meta-llama/llama-3.3-70b-instruct:free', options: {} };
                n.type = '@n8n/n8n-nodes-langchain.lmChatOpenRouter';
                n.name = 'OpenRouter (Free LLaMA 70B)';
                n.credentials = { openRouterApi: { id: 'CN5018CsgxQLJts8', name: 'OpenRouter account' } };
                changes++;
            }
            if (n.parameters?.model === 'gemma2-9b-it') {
                n.parameters.model = 'llama-3.3-70b-versatile';
                changes++;
            }
        });
        console.log('Nodes to fix:', changes);
        
        const wfJson = JSON.stringify(wf);
        const fs = require('fs');
        fs.writeFileSync('/tmp/wf_api_push.json', wfJson);
        await ssh.putFile('/tmp/wf_api_push.json', '/tmp/wf_api_push.json');
        
        const pushRes = await ssh.execCommand(`curl -s -X PUT http://127.0.0.1:5678/api/v1/workflows/${WORKFLOW_ID} -H "X-N8N-API-KEY: ${apiKeyValue}" -H "Content-Type: application/json" -d @/tmp/wf_api_push.json -w " HTTP:%{http_code}"`);
        console.log('PUT result:', pushRes.stdout.slice(-20));
    }

    ssh.dispose();
}).catch(e => console.error(e));
