const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function readBotScript() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const res = await ssh.execCommand('sed -n "26,100p" /opt/crm-cannabis/bot-wa.js');
        console.log('Bot Script Lines 26-100:\n', res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error('Read bot script failed:', err.message);
    }
}

readBotScript();
