const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixButton() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Patching index.html...');
        // Add flex-shrink: 0 to protect button width
        const cmd = `sed -i 's/width: auto; font-size: 0.9rem; white-space: nowrap;/width: auto; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;/g' /opt/crm-cannabis/index.html`;
        await ssh.execCommand(cmd);

        // Alternative match string just in case
        const cmd2 = `sed -i 's/padding: 8px 15px; width: auto; font-size: 0.9rem;/padding: 8px 15px; width: auto; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;/g' /opt/crm-cannabis/index.html`;
        await ssh.execCommand(cmd2);

        console.log('✅ Button patched successfully.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixButton();
