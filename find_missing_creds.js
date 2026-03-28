const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findMissingCreds() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\'scpZdPe5Cp4MG98G\';"');
        
        if (res.stdout) {
            let jsonStr = res.stdout;
            // SQLite export might wrap in quotes, clean it:
            if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
                 jsonStr = jsonStr.slice(1, -1).replace(/""/g, '"');
            }
            // Also handle single quotes if escaped that way
            jsonStr = jsonStr.replace(/''/g, "'");

            try {
                const nodes = JSON.parse(jsonStr);
                let foundAny = false;
                for (let n of nodes) {
                    if (n.credentials) {
                        for (let k in n.credentials) {
                            if (!n.credentials[k].id) {
                                console.log(`! MISSING ID in node: "${n.name}" -> ${k}`);
                                foundAny = true;
                            }
                        }
                    }
                }
                if(!foundAny) console.log("All credentials have IDs linked.");
            } catch(e) {
                console.log("JSON Parse error:", e.message);
                console.log("First 200 chars:", jsonStr.substring(0, 200));
            }
        }
        ssh.dispose();
    } catch(e) {
        console.error(e);
        ssh.dispose();
    }
}
findMissingCreds();
