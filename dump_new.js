const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function getExecs() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        try {
            const stdout = execSync('sqlite3 /root/.n8n/database.sqlite "SELECT id FROM execution_entity ORDER BY startedAt DESC LIMIT 3;"').toString();
            const ids = stdout.split(/\\r?\\n/).map(s => s.trim()).filter(s => s.length > 0);
            console.log("Found IDs:", ids);
            
            for (let id of ids) {
                try {
                   const hex = execSync(\`sqlite3 /root/.n8n/database.sqlite "SELECT hex(data) FROM execution_data WHERE executionId='\${id}';"\`).toString().trim();
                   if(hex) {
                       const buf = Buffer.from(hex, 'hex');
                       const dataStr = buf.toString('utf8');
                       fs.writeFileSync('/tmp/e' + id + '.json', dataStr);
                       console.log("Wrote /tmp/e" + id + ".json");
                   } else {
                       console.log("No hex data for", id);
                   }
                } catch(e) { console.log("Error", id, e.message); }
            }
        } catch(e) {
            console.error("Fatal:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/dumper.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/dumper.js');
        console.log("Dumper output:\\n", res.stdout);
        if(res.stderr) console.error("Dumper error:\\n", res.stderr);

        // Parse the IDs that were actually found to download them
        const idMatch = res.stdout.match(/Found IDs: \\[ (.*?) \\]/);
        if (idMatch) {
            const idsStr = idMatch[1].replace(/'/g, '').split(',').map(s=>s.trim());
            for (let id of idsStr) {
                try {
                    await ssh.getFile(`clean_e${id}.json`, `/tmp/e${id}.json`);
                    console.log(`Downloaded clean_e${id}.json`);
                } catch(e) {}
            }
        }

        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
getExecs();
