const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function addLogout() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // We will use sed to inject a logout button right after the user profile avatar in index.html
        const insertCmd = `sed -i 's|<div class="user-profile" style="margin-left: 10px;">|<button class="btn-primary" onclick="logoutUser()" style="background: transparent; border: 1px solid var(--color-red); color: var(--color-red); padding: 8px 15px; margin-left: 10px;"><i class="ph ph-sign-out"></i> Salir</button>\\n                    <div class="user-profile" style="margin-left: 10px;">|g' /opt/crm-cannabis/index.html`;

        await ssh.execCommand(insertCmd);
        console.log('✅ Added logout button to index.html');

        // Validate if it works
        const check = await ssh.execCommand('grep -A 2 "logoutUser()" /opt/crm-cannabis/index.html');
        console.log(check.stdout);

        ssh.dispose();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

addLogout();
