const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
    try {
        console.log('Connecting to production server (109.199.99.126)...');
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('Uploading agronomy.js...');
        await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/agronomy.js', '/opt/crm-cannabis/agronomy.js');
        
        console.log('Uploading agronomy.html...');
        await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/agronomy.html', '/opt/crm-cannabis/agronomy.html');

        console.log('✅ Deployment successful!');
        
        // Quick verify on server
        const check = await ssh.execCommand('ls -l /opt/crm-cannabis/agronomy.*');
        console.log('Server file status:\n', check.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    }
}

deploy();
