const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function patchHTML() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Patching index.html...');
        // Replace width: auto; with width: auto; white-space: nowrap; on the button
        const cmd = `sed -i 's/width: auto; font-size: 0.9rem;/width: auto; font-size: 0.9rem; white-space: nowrap;/g' /opt/crm-cannabis/index.html`;
        await ssh.execCommand(cmd);

        console.log('✅ HTML patched successfully.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

patchHTML();
