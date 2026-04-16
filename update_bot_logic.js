const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
        let content = res.stdout;

        if (!content.includes('const isSelfChat = msg.from === msg.to;')) {
            content = content.replace(
                'const isAdmin = ADMIN_NUMS.some(num => sender.includes(num));',
                'const isAdmin = ADMIN_NUMS.some(num => sender.includes(num));\n    const isSelfChat = msg.from === msg.to;'
            );
        }

        content = content.replace(
            'if (!isAdmin) {',
            'if (!isAdmin || !isSelfChat || msg.from.includes(\'@g.us\') || msg.from.includes(\'@broadcast\')) {'
        );

        await ssh.execCommand(`cat << 'EOF' > /opt/crm-cannabis/bot-wa.js\n${content}\nEOF`);
        await ssh.execCommand('pm2 restart whatsapp-bot');
        
        console.log('Bot logic updated and restarted.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
})();
