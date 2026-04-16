const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getExecution() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const dataRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT data FROM execution_entity WHERE id='78';\"");
        fs.writeFileSync('exec_78.json', dataRes.stdout);
        console.log("Saved to exec_78.json");
        
        const dataRes82 = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT data FROM execution_entity WHERE id='82';\"");
        fs.writeFileSync('exec_82.json', dataRes82.stdout);
        console.log("Saved to exec_82.json");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getExecution();
