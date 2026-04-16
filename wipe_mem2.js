const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function wipeLangChainMemory() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const { execSync } = require('child_process');
        try {
            console.log("Wiping chat memory...");
            execSync('sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_hub_messages;"');
            execSync('sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_hub_sessions;"');
            console.log("SUCCESS! Conversation memory is wiped clean.");
        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/wipe_mem2.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/wipe_mem2.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
wipeLangChainMemory();
