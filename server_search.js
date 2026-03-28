const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const res = await ssh.execCommand('grep -r "wzajpibwhtrtxddqejnj" /root/.n8n || echo "Not found"');
        console.log('--- Server Search Results ---');
        console.log(res.stdout);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
