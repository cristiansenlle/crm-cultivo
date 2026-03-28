const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        // Check the main n8n db for core_rooms
        const res = await ssh.execCommand("sqlite3 -json /root/.n8n/database.sqlite \"SELECT * FROM core_rooms;\"");
        console.log("--- core_rooms query results ---");
        console.log(res.stdout || "No results found in core_rooms.");
        if (res.stderr) console.error("Error:", res.stderr);

        ssh.dispose();
    } catch (err) {
        console.error('Audit failed:', err.message);
    }
})();
