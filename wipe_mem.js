const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function wipeMem() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const { execSync } = require('child_process');
        try {
            console.log("Checking tables...");
            const tables = execSync('sqlite3 /root/.n8n/database.sqlite ".tables"').toString();
            console.log(tables);
            
            if (tables.includes('chat_messages')) {
                execSync('sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_messages;"');
                console.log("WIPED chat_messages TABLE!");
            }
            if (tables.includes('memory')) {
                execSync('sqlite3 /root/.n8n/database.sqlite "DELETE FROM memory;"');
                console.log("WIPED memory TABLE!");
            }
        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/wipe_mem.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/wipe_mem.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
wipeMem();
