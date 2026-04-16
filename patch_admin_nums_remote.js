const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function patchAdminNums() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
        let content = res.stdout;
        
        const userPhone = '5491136254422@c.us';
        
        if (content.includes('const ADMIN_NUMS = [')) {
            if (!content.includes(userPhone)) {
                content = content.replace("const ADMIN_NUMS = [", `const ADMIN_NUMS = [\n        '${userPhone}',`);
                await ssh.execCommand(`cat > /tmp/bot-wa_patched.js << 'EOF'\n${content}\nEOF`);
                await ssh.execCommand('mv /tmp/bot-wa_patched.js /opt/crm-cannabis/bot-wa.js');
                console.log('Successfully added user phone to ADMIN_NUMS.');
                await ssh.execCommand('pm2 restart whatsapp-bot');
                console.log('Restarted whatsapp-bot.');
            } else {
                console.log('User phone already in ADMIN_NUMS.');
            }
        } else {
            console.error('ADMIN_NUMS list not found in script.');
        }
        
        ssh.dispose();
    } catch (err) {
        console.error('Patch admin nums failed:', err.message);
    }
}

patchAdminNums();
