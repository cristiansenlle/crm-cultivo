// Check current state of cultivo.js on server
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

    // Get the crop location dropdown code from cultivo.js
    const grep = await ssh.execCommand('grep -n "cropLocation\\|core_rooms\\|core_batches\\|location\\|room_id\\|INSERT\\|5678\\|batch_id" /opt/crm-cannabis/cultivo.js | head -60');
    console.log('cultivo.js key lines:\n', grep.stdout);

    // Get current webkhook URL
    const webhooks = await ssh.execCommand('grep -n "fetch\\|webhook\\|5678\\|5679\\|5680" /opt/crm-cannabis/cultivo.js | head -20');
    console.log('\nWebhook refs:\n', webhooks.stdout);

    ssh.dispose();
}
check().catch(console.error);
