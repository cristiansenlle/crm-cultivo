const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixAdminCapture() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const res = await ssh.execCommand('cat /opt/crm-cannabis/bot-wa.js');
        let content = res.stdout;
        
        const targetNumber = '5491156548820'; // Base number
        
        // Find the place where phoneNum is calculated and isAdmin is checked
        // We want to change the logic to: 
        // 1. Get the actual sender (msg.from)
        // 2. If it's fromMe, the sender is the bot itself.
        // 3. Check if the SENDER is an admin.
        
        const oldLogic = `    let phoneNum = msg.from;
    if (msg.fromMe) phoneNum = msg.to;

    // Admin Numbers (JID and LID)
    const ADMIN_NUMS = [
        '5491156548820@c.us'
    ];
    
    const isAdmin = ADMIN_NUMS.some(num => phoneNum.includes(num.split('@')[0]));`;

        const newLogic = `    // Process messages FROM the admin (automatic or manual)
    const ADMIN_NUMS = [
        '5491156548820'
    ];
    
    // Check if the actual sender (msg.from) is the admin
    const sender = msg.from.split('@')[0];
    const isAdmin = ADMIN_NUMS.some(num => sender.includes(num));

    if (!isAdmin) {
        console.log(\`[DEBUG] Ignored: Not from admin (\${msg.from})\`);
        return;
    }

    // Capture the target context: if it's fromMe, we are capturing our own data sent to someone else
    // We want n8n to know who we are talking to if necessary, but primarily we want to capture the body.
    console.log(\`\\n===========================================\`);
    console.log(\`[WA] Capturando mensaje de ADMIN: \${msg.from}\`);
    console.log(\`[WA] Texto: "\${msg.body}"\`);`;

        if (content.includes('let phoneNum = msg.from;')) {
            // Replace the block. Using a more robust regex-like replacement if exact match fails
            content = content.replace(/let phoneNum = msg\.from;[\s\S]*?console\.log\(`\[WA\] Texto: "\${msg\.body}"`\);/, newLogic);
            
            await ssh.execCommand(`cat > /tmp/bot-wa_fixed.js << 'EOF'\n${content}\nEOF`);
            await ssh.execCommand('mv /tmp/bot-wa_fixed.js /opt/crm-cannabis/bot-wa.js');
            console.log('Successfully updated bot-wa.js with corrected admin capture logic.');
            await ssh.execCommand('pm2 restart whatsapp-bot');
            console.log('Restarted whatsapp-bot.');
        } else {
            console.error('Could not find logic block to replace.');
        }

        ssh.dispose();
    } catch (err) {
        console.error('Fix admin capture failed:', err.message);
    }
}

fixAdminCapture();
