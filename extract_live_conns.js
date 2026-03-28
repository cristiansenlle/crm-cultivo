const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT connections FROM workflow_entity WHERE id = 'scpZdPe5Cp4MG98G';\"");
        
        if (!res.stdout) {
             console.log("No connections found.");
             ssh.dispose();
             return;
        }

        const data = JSON.parse(res.stdout);
        const conns = JSON.parse(data[0].connections);
        
        fs.writeFileSync('live_connections_v2.json', JSON.stringify(conns, null, 2));
        console.log("Live connections extracted to live_connections_v2.json");

        ssh.dispose();
    } catch (err) {
        console.error('Extraction failed:', err.message);
    }
})();
