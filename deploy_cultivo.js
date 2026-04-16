// Upload patched cultivo.js to server
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    await ssh.putFile('cultivo_server.js', '/opt/crm-cannabis/cultivo.js');
    console.log('✅ cultivo.js deployed with dynamic room dropdown');
    // Quick verify
    const check = await ssh.execCommand('grep -n "loadRoomsDropdown\\|core_rooms" /opt/crm-cannabis/cultivo.js');
    console.log('Verification:\n', check.stdout);
    ssh.dispose();
}
deploy().catch(console.error);
