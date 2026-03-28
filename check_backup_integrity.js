const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

(async () => {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
        
        async function check(db) {
            const r = await ssh.execCommand(`sqlite3 ${db} "PRAGMA integrity_check;"`);
            return r.stdout || 'ERROR';
        }

        console.log('--- Backup Integrity Check ---');
        console.log('roomname_fix:', await check('/opt/crm-cannabis/recovery_db_roomname_fix.sqlite'));
        console.log('stabilize_v2:', await check('/opt/crm-cannabis/recovery_db_stabilize_v2.sqlite'));

        ssh.dispose();
    } catch (err) {
        console.error('Check failed:', err.message);
    }
})();
