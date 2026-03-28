const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkNodes() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Fetching nodes from SQLite...");
        let res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');

        const nodesStr = res.stdout.trim();
        const nodes = JSON.parse(nodesStr);
        console.log(`Parsed ${nodes.length} nodes successfully.`);

        for (const n of nodes) {
            if (n.type === 'n8n-nodes-base.executeCommand') {
                console.log("FOUND EXECUTE COMMAND NODE:");
                console.log(JSON.stringify(n, null, 2));
            }
        }
        ssh.dispose();
    } catch (e) {
        console.error("Error:", e.message);
        ssh.dispose();
    }
}

checkNodes();
