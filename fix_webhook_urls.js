const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixWebhookURLs() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Replacing localhost:5678 with 109.199.99.126:5678 in JS and HTML files...');

        // Replace in all JS and HTML files
        const cmd = `sed -i 's|http://localhost:5678|http://109.199.99.126:5678|g' /opt/crm-cannabis/*.js /opt/crm-cannabis/*.html`;
        await ssh.execCommand(cmd);

        console.log('✅ Webhook URLs patched. Done.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixWebhookURLs();
