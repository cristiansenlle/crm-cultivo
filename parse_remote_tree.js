const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function parseRemote() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
        const fs = require('fs');

        [100, 99, 98, 97, 96, 95].forEach(id => {
            try {
                const raw = fs.readFileSync('/tmp/e' + id + '.json', 'utf8');
                const data = JSON.parse(raw);
                
                console.log("\\n===========================================");
                console.log("             EXECUTION " + id);
                console.log("===========================================");
                
                // Find Chat Input
                const startNode = data.data.resultData.runData['Webhook'];
                if(startNode && startNode[0] && startNode[0].data && startNode[0].data.main) {
                     const body = startNode[0].data.main[0][0].json.body;
                     console.log("[USER INPUT]:", body.text || body.message);
                }

                for (let key in data.data.resultData.runData) {
                    if (key.includes('AI Agent')) {
                        const runs = data.data.resultData.runData[key];
                        runs.forEach((run, idx) => {
                            if(run.data && run.data.main && run.data.main[0]) {
                                const items = run.data.main[0];
                                items.forEach(item => {
                                    if(item.json && item.json.output) {
                                        console.log("\\n[AI OUTPUT TEXT]: " + item.json.output.substring(0, 200).replace(/\\n/g, ' '));
                                    }
                                    if(item.json && item.json.toolCalls) {
                                        console.log("\\n[AI TOOL CALLS]: " + JSON.stringify(item.json.toolCalls));
                                    }
                                });
                            }
                            if(run.error) {
                                 console.log("\\n[AI ERROR]:", run.error.message);
                            }
                        });
                    }
                    if (key.includes('cargar_telemetria')) {
                        const runs = data.data.resultData.runData[key];
                        runs.forEach((run, idx) => {
                            if(run.error) {
                                console.log("\\n[TELEMETRIA API ERROR]:", run.error.message);
                                if(run.error.description) console.log("   ->", run.error.description);
                            }
                            if(run.data && run.data.main && run.data.main[0]) {
                                 console.log("\\n[TELEMETRIA SUCCESS]:", JSON.stringify(run.data.main[0][0].json).substring(0, 200));
                            }
                        });
                    }
                }

            } catch(e) { } // Ignore missing files
        });
        `;
        
        await ssh.execCommand('cat > /tmp/parse_remote.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/parse_remote.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
parseRemote();
