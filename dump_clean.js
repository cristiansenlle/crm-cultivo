const { NodeSSH } = require('node-ssh');
const fs = require('fs');

async function getCleanExec() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        // Use sqlite3 CLI to dump hex, then parse it to avoid quote issues
        const hex = execSync('sqlite3 /root/.n8n/database.sqlite "SELECT hex(data) FROM execution_entity ORDER BY startedAt DESC LIMIT 5;"').toString();
        const lines = hex.trim().split('\\n');
        
        let i = 1;
        for (const line of lines) {
            if (!line) continue;
            const buf = Buffer.from(line, 'hex');
            const dataStr = buf.toString('utf8');
            try {
                const data = JSON.parse(dataStr);
                fs.writeFileSync('/tmp/e' + i + '.json', JSON.stringify(data, null, 2));
            } catch(e) {
                console.log("Error parsing line " + i, e.message);
            }
            i++;
        }
        console.log("Dumped " + (i-1) + " executions cleanly.");
        `;

        await ssh.execCommand('cat > /tmp/dumper.js', { stdin: script });
        console.log("Running dumper on server...");
        const res = await ssh.execCommand('node /tmp/dumper.js');
        console.log(res.stdout);
        console.log(res.stderr);

        for (let i = 1; i <= 5; i++) {
            await ssh.getFile(`clean_e${i}.json`, `/tmp/e${i}.json`);
        }
        console.log("Downloaded all 5 clean execution dumps.");

        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
getCleanExec();
