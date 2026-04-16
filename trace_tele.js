const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function traceTelemetry() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const { execSync } = require('child_process');
        try {
            const stdout = execSync('sqlite3 /root/.n8n/database.sqlite "SELECT executionId FROM execution_data ORDER BY executionId DESC LIMIT 5;"').toString();
            const ids = stdout.split(/\\r?\\n/).map(s => s.trim()).filter(s => s.length > 0);
            
            for (let id of ids) {
                console.log("\\n=== EXECUTION " + id + " ===");
                try {
                   const hex = execSync(\`sqlite3 /root/.n8n/database.sqlite "SELECT hex(data) FROM execution_data WHERE executionId='\${id}';"\`).toString().trim();
                   if(hex) {
                       const buf = Buffer.from(hex, 'hex');
                       const dataStr = buf.toString('utf8');
                       
                       // Search broadly for 'temperature_c' to see what the agent actually submitted to the node.
                       const mNode = dataStr.match(/cargar_telemetria.{1,800}temperature_c.{1,100}/);
                       if(mNode) {
                           console.log("--> TELEMETRY TRIGGERED!");
                           console.log("   PAYLOAD: " + mNode[0]);
                       }

                       // Search broadly for Supabase errors
                       const err = dataStr.match(/"error":\\{.*?message":"(.*?)"/);
                       if(err) {
                           console.log("   ERROR MESSAGE: " + err[1]);
                       }
                       const errRes = dataStr.match(/"response":\\{.*?status":(.*?),/);
                       if(errRes) {
                           console.log("   HTTP STATUS: " + errRes[1]);
                       }
                       
                   }
                } catch(e) { console.log("Error reading hex for", id); }
            }
        } catch(e) {
            console.error("Fatal:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/trace_tele.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/trace_tele.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
traceTelemetry();
