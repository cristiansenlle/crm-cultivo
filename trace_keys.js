const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function traceKeys() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
        const fs = require('fs');

        [100, 99, 98, 97, 96].forEach(id => {
            try {
                const raw = fs.readFileSync('/tmp/e' + id + '.json', 'utf8');
                const data = JSON.parse(raw);
                
                console.log("\\n=== EXECUTION " + id + " KEYS ===");
                if (data && data.data && data.data.resultData && data.data.resultData.runData) {
                    console.log(Object.keys(data.data.resultData.runData));
                } else {
                    console.log("No runData found.");
                }

            } catch(e) { } 
        });
        `;
        
        await ssh.execCommand('cat > /tmp/trace_keys.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/trace_keys.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
traceKeys();
