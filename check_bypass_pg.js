const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSupaAuth() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Checking n8n envs for Supabase ---');
    let res = await ssh.execCommand('cat /root/.n8n/.env');
    console.log(res.stdout);

    // Let's also parse the workflow json to find the failing node credentials
    let localWf = require('fs').readFileSync('n8n-crm-cannabis-workflow.json', 'utf-8');
    let data = JSON.parse(localWf);
    let bypassPqNode = data.nodes.find(n => n.name === 'Bypass PG' || n.id === 'exec-bypass-telemetry');
    
    if (bypassPqNode) {
        console.log('\n--- Bypass PG Node details ---');
        console.log(JSON.stringify(bypassPqNode.parameters.headerParameters, null, 2));
    }

    ssh.dispose();
}

checkSupaAuth().catch(console.error);
