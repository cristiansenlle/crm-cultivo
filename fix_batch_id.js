const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixBatchId() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log('Fixing batch_id mapping in main.js payload...');

        const replaceCmd = `sed -i 's|batch_id: currentRoomId,|batch_id: ROOM_ID_MAP[currentRoomId] || currentRoomId,|g' /opt/crm-cannabis/main.js`;
        await ssh.execCommand(replaceCmd);

        console.log('✅ batch_id sync patched.');
        ssh.dispose();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixBatchId();
