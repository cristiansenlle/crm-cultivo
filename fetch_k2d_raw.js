const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        console.log('--- Fetching k2d Nodes ---');
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT nodes, connections FROM workflow_entity WHERE id = 'k2d7SbuTEeGHCDzR';\"");
        const data = JSON.parse(res.stdout || '[]');
        
        if (data.length > 0) {
            fs.writeFileSync('k2d_raw.json', JSON.stringify(data[0], null, 2));
            console.log('Saved k2d_raw.json');
        } else {
            console.error('k2d not found');
        }

        ssh.dispose();
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
})();
