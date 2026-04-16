const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
        
        // Find PID
        const psRes = await ssh.execCommand('ss -tpln | grep 5678');
        const match = psRes.stdout.match(/pid=(\d+)/);
        if (!match) {
            console.log('No n8n PID found on port 5678.');
            ssh.dispose();
            return;
        }
        const pid = match[1];
        console.log('Detected PID:', pid);

        // Get Environ
        const envRes = await ssh.execCommand(`cat /proc/${pid}/environ | tr "\\0" "\\n"`);
        console.log('--- Environment Variables ---');
        console.log(envRes.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Inspection failed:', err.message);
    }
})();
