const fs = require('fs');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function patchCreds() {
    try {
        const d = JSON.parse(fs.readFileSync('patched_export.json', 'utf8'));
        const wf = Array.isArray(d) ? d[0] : (d['0'] || d);

        for (let node of wf.nodes) {
            if (node.credentials) {
                if (node.credentials.groqApi) {
                    node.credentials.groqApi.id = 'relM2SypDqndJWK2';
                    console.log("Patched Groq for", node.name);
                }
                if (node.credentials.openRouterApi) {
                    node.credentials.openRouterApi.id = 'CN5018CsgxQLJts8';
                    console.log("Patched OpenRouter for", node.name);
                }
                if (node.credentials.googleCalendarOAuth2Api) {
                    node.credentials.googleCalendarOAuth2Api.id = 'iASUJxoi1rnGXLhn';
                    console.log("Patched Google Calendar for", node.name);
                }
            }
        }

        fs.writeFileSync('patched_creds_export.json', JSON.stringify(wf, null, 2));
        console.log("Saved to patched_creds_export.json");

        // Upload and apply
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        await ssh.putFile('patched_creds_export.json', '/root/patched_creds_export.json');
        console.log("File uploaded.");

        // Read nodes string
        const wfString = JSON.stringify(wf.nodes).replace(/'/g, "''");

        console.log("Applying to SQLite...");
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET nodes='${wfString}' WHERE id='scpZdPe5Cp4MG98G';"`);
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_history SET nodes='${wfString}' WHERE versionId='2998cacd-6008-476a-b25b-b0c472316cd9';"`);

        console.log("Restarting n8n...");
        await ssh.execCommand('pm2 restart n8n-service');
        await new Promise(r => setTimeout(r, 15000));

        console.log("Running local payload test...");
        require('child_process').execSync('node test_actual_fresh.js', { stdio: 'inherit' });

        ssh.dispose();
    } catch (e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
patchCreds();
