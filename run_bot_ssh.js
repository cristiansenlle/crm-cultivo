const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    const host = '109.199.99.126';
    const username = 'root';
    const pwd = 'FVRu0i2XiWUP93OtQfI7LvPKod';

    console.log('Connecting to Contabo to start the WhatsApp Bot...');
    try {
        await ssh.connect({
            host,
            username,
            password: pwd,
            readyTimeout: 10000
        });
        console.log('✅ Connected! Launching bot-wa.js. PLEASE WAIT FOR THE QR CODE TO APPEAR...');
    } catch (e) {
        console.error('❌ Failed to connect.', e);
        return;
    }

    try {
        // Explicitly cd before running node
        await ssh.execCommand('cd /opt/crm-cannabis && node bot-wa.js', {
            onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
            onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
        });
    } catch (err) {
        console.error('Error during bot execution:', err);
    } finally {
        ssh.dispose();
    }
}
run();
