const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function getExecs() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
        const fs = require('fs');
        const { execSync } = require('child_process');
        try {
            console.log("Extracting last 5 executions from active DB...");
            const res = execSync('sqlite3 /root/.n8n/database.sqlite "SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 2;"').toString();
            
            require('fs').writeFileSync('/tmp/latest_execs3.txt', res);
        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/dump_exec3.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/dump_exec3.js');
        console.log(res.stdout);
        
        // Download the file
        await ssh.getFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\latest_execs3.txt', '/tmp/latest_execs3.txt');
        ssh.dispose();
        console.log("Downloaded to latest_execs3.txt");
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
getExecs();
