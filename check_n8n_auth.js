const { NodeSSH } = require('node-ssh');
const http = require('http');
const ssh = new NodeSSH();

const N8N_HOST = '109.199.99.126';
const N8N_PORT = 5678;
const WORKFLOW_ID = 'scpZdPe5Cp4MG98G';

ssh.connect({ host: N8N_HOST, username: 'root', password: 'HIDDEN_SECRET_BY_AI' }).then(async () => {

    // 1. Check n8n user status
    const userCheck = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT email, password, role FROM user LIMIT 5;\"");
    console.log('Users:', userCheck.stdout);

    // 2. Check if n8n is still running and accessible  
    const health = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5678/healthz');
    console.log('n8n health:', health.stdout);

    // 3. Try getting the session cookie from server-side curl login
    // First, check the exact login endpoint format for this n8n version
    const loginTest = await ssh.execCommand(`curl -s -c /tmp/n8n_cookie.txt -X POST http://127.0.0.1:5678/rest/login -H 'Content-Type: application/json' -d '{"email":"cristiansenlle@gmail.com","password":"Fn@175341"}' -w " HTTP:%{http_code}"`);
    console.log('\nLogin attempt:', loginTest.stdout.substring(0, 300));

    // 4. Try the session-based workflow update from server
    const wfFetch = await ssh.execCommand(`curl -s -b /tmp/n8n_cookie.txt http://127.0.0.1:5678/rest/workflows/${WORKFLOW_ID} -w " HTTP:%{http_code}"`);
    console.log('WF fetch status:', wfFetch.stdout.slice(-20));

    ssh.dispose();
}).catch(e => console.error(e));
