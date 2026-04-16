const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function dumpExec() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const { execSync } = require('child_process');
        try {
            console.log("Extracting last 5 executions from active DB...");
            const res = execSync('sqlite3 /root/.n8n/database.sqlite "SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 2;"').toString();
            console.log(res.length + " bytes of logs retrieved.");
            
            require('fs').writeFileSync('/tmp/latest_execs.txt', res);
        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/dump_exec.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/dump_exec.js');
        console.log(res.stdout);
        
        // Download the file
        await ssh.getFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\latest_execs.txt', '/tmp/latest_execs.txt');
        ssh.dispose();
        console.log("Downloaded to latest_execs.txt");
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
dumpExec();
