const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const newStatus = `
            <div class="system-status" style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;">
                <div class="status-indicator" id="waStatusDot" style="background: gray; width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 5px;"></div>
                <span id="waStatusText" style="font-size: 0.85rem; color: #ccc;">WhatsApp: Conectando...</span>
            </div>`;

async function doUpdate() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod' 
        });

        const res = await ssh.execCommand('cat /opt/crm-cannabis/index.html');
        let content = res.stdout;
        
        if (!content.includes('waStatusDot')) {
            content = content.replace('<div class="system-status">', '<div class="system-status">\n' + newStatus);
            await ssh.execCommand('cat > /opt/crm-cannabis/index.html', { stdin: content });
            console.log('Successfully updated index.html with WA status');
        } else {
            console.log('WA Status already exists in index.html');
        }
        
        ssh.dispose();
    } catch (err) {
        console.error('Update failed:', err.message);
    }
}

doUpdate();
