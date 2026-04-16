const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNodeInExe() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT workflowData FROM execution_entity WHERE id = 51"');
    let wfStr = res.stdout.trim();
    if (!wfStr) {
        console.log("No workflow data found.");
        return ssh.dispose();
    }

    try {
        const wf = JSON.parse(wfStr);
        const node = wf.nodes.find(v => v.name === 'consultar_lotes_groq');
        console.log(JSON.stringify(node, null, 2));
    } catch (e) {
        console.error("JSON parse error:", e.message);
    }

    ssh.dispose();
}

checkNodeInExe().catch(console.error);
