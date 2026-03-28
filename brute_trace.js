const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function bruteForce() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
        const { execSync } = require('child_process');
        
        try {
            const stdout = execSync('sqlite3 /root/.n8n/database.sqlite "SELECT executionId FROM execution_data ORDER BY executionId DESC LIMIT 3;"').toString();
            const ids = stdout.split(/\\r?\\n/).map(s => s.trim()).filter(s => s.length > 0);
            
            for (let id of ids) {
                console.log("\\n=== EXECUTION " + id + " ===");
                try {
                   const hex = execSync(\`sqlite3 /root/.n8n/database.sqlite "SELECT hex(data) FROM execution_data WHERE executionId='\${id}';"\`).toString().trim();
                   if(hex) {
                       const str = Buffer.from(hex, 'hex').toString('utf8');
                       
                       // Find the user prompt. We search for "chatInput":"text" or just "text"
                       let idx = str.indexOf('"chatInput":"');
                       if (idx !== -1) {
                           let end = str.indexOf('"', idx + 13);
                           console.log("USER:", str.substring(idx + 13, end));
                       } else {
                           let idx2 = str.indexOf('"text":"');
                           if(idx2 !== -1) {
                               let end = str.indexOf('"', idx2 + 8);
                               console.log("USER (text):", str.substring(idx2 + 8, end));
                           }
                       }

                       // Find AI Responses
                       let lastIdx = 0;
                       while(true) {
                           let outIdx = str.indexOf('"output":"', lastIdx);
                           if(outIdx === -1) break;
                           let endIdx = str.indexOf('"', outIdx + 10);
                           console.log("AI:", str.substring(outIdx + 10, Math.min(endIdx, outIdx + 250)).replace(/\\n/g, ' '));
                           lastIdx = endIdx;
                       }

                       // Find API Errors
                       let errIdx = str.indexOf('"error":{');
                       if (errIdx !== -1) {
                           console.log("ERROR BLOCK FOUND AROUND:", str.substring(errIdx, errIdx + 200).replace(/\\n/g, ' '));
                       }

                       // Find tool inputs
                       if(str.includes('temperature_c')) {
                            const tIdx = str.indexOf('temperature_c');
                            console.log("PAYLOAD AROUND temp:", str.substring(tIdx - 150, tIdx + 150).replace(/\\n/g, ' '));
                       }
                       if(str.includes('batch_id')) {
                           const bIdx = str.indexOf('batch_id');
                           console.log("PAYLOAD AROUND batch:", str.substring(bIdx - 100, bIdx + 100).replace(/\\n/g, ' '));
                       }
                   }
                } catch(e) {}
            }
        } catch(e) {}
        `;
        
        await ssh.execCommand('cat > /tmp/brute.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/brute.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
bruteForce();
