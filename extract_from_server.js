const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        // Search for project IDs and JWTs in bot_nodes_full.json
        const res = await ssh.execCommand('grep -o "https://[a-z0-9]*\\.supabase\\.co" /root/bot_nodes_full.json | head -n 1 && grep -o "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.[a-zA-Z0-9_-]*.[a-zA-Z0-9_-]*" /root/bot_nodes_full.json | head -n 1');
        console.log('--- Credentials Found ---');
        console.log(res.stdout);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
