const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        console.log('Connecting to production server (109.199.99.126)...');

        const files = [
            { local: 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\main.js', remote: '/opt/crm-cannabis/main.js' },
            { local: 'c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\index.html', remote: '/opt/crm-cannabis/index.html' }
        ];

        for (const file of files) {
            console.log(`Uploading ${file.local.split('\\').pop()}...`);
            await ssh.putFile(file.local, file.remote);
        }

        console.log('✅ Dashboard deployment successful!');
        
        // Bonus: Update index.html version for cache busting if needed
        // For now, these are the main logic files.
        
        ssh.dispose();
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

deploy();
