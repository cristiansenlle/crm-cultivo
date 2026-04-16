const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function createBackup() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    console.log('--- Creating Stable Backup ---');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `/opt/crm-cannabis/bot-wa-stable-backup-${timestamp}.js`;
    
    let res = await ssh.execCommand(`cp /opt/crm-cannabis/bot-wa.js ${backupName}`);
    if (res.code === 0) {
        console.log(`Successfully backed up bot script to: ${backupName}`);
    } else {
        console.error(`Backup failed: ${res.stderr}`);
    }

    // Also copy to a known 'latest' backup name for easy reference
    await ssh.execCommand(`cp /opt/crm-cannabis/bot-wa.js /opt/crm-cannabis/bot-wa-stable-backup-latest.js`);
    console.log(`Also created: /opt/crm-cannabis/bot-wa-stable-backup-latest.js`);

    ssh.dispose();
}

createBackup().catch(console.error);
