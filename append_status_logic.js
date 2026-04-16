const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const scriptToAppend = `

async function checkBotStatus() {
    try {
        const response = await fetch('/status.json');
        if (!response.ok) throw new Error('Not found');
        const data = await response.json();
        
        const dot = document.getElementById('waStatusDot');
        const text = document.getElementById('waStatusText');
        if (!dot || !text) return;

        if (data.status === 'online') {
            dot.style.background = '#2ecc71';
            text.innerText = 'WhatsApp: Conectado';
        } else if (data.status === 'awaiting_qr') {
            dot.style.background = '#f1c40f';
            text.innerText = 'WhatsApp: Esperando QR';
        } else {
            dot.style.background = '#e74c3c';
            text.innerText = 'WhatsApp: Desconectado';
        }
    } catch (e) {
        const dot = document.getElementById('waStatusDot');
        const text = document.getElementById('waStatusText');
        if (dot && text) {
            dot.style.background = '#e74c3c';
            text.innerText = 'WhatsApp: Error Check';
        }
    }
}

setInterval(checkBotStatus, 15000);
checkBotStatus();
`;

async function doAppend() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        // Get current main.js
        const res = await ssh.execCommand('cat /opt/crm-cannabis/main.js');
        const newContent = res.stdout + scriptToAppend;
        
        // Write back
        await ssh.execCommand(`cat > /opt/crm-cannabis/main.js`, { stdin: newContent });
        console.log('Successfully appended status logic to main.js');
        
        ssh.dispose();
    } catch (err) {
        console.error('Append failed:', err.message);
    }
}

doAppend();
