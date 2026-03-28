const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restrictToSingleAdmin() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
        let content = res.stdout;
        
        const targetNumber = '5491156548820@c.us';
        
        // Match the entire ADMIN_NUMS array to ensure ONLY the target is present
        const startMarker = 'const ADMIN_NUMS = [';
        const endMarker = '];';
        
        const startIndex = content.indexOf(startMarker);
        const endIndex = content.indexOf(endMarker, startIndex);

        if (startIndex !== -1 && endIndex !== -1) {
            const newArray = `${startMarker}\n        '${targetNumber}'\n    ${endMarker}`;
            const oldArray = content.substring(startIndex, endIndex + endMarker.length);
            
            content = content.replace(oldArray, newArray);
            
            await ssh.execCommand(`cat > /tmp/bot-wa_restricted.js << 'EOF'\n${content}\nEOF`);
            await ssh.execCommand('mv /tmp/bot-wa_restricted.js /opt/crm-cannabis/bot-wa.js');
            console.log(`Successfully restricted bot to: ${targetNumber}`);
            
            await ssh.execCommand('pm2 restart whatsapp-bot');
            console.log('Restarted whatsapp-bot gateway.');
        } else {
            console.error('Could not find ADMIN_NUMS block to modify.');
        }
        
        ssh.dispose();
    } catch (err) {
        console.error('Restriction failed:', err.message);
    }
}

restrictToSingleAdmin();
