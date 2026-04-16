const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixVps() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'SWbCPD6AdBac'
        });
        
        console.log('✅ Connected. Performing Hard Reset of Node and Port 80 on Contabo...\n');
        
        // Kill PM2 and any hanging node process
        await ssh.execCommand('pm2 kill || true');
        await ssh.execCommand('killall -9 node || true');
        await ssh.execCommand('fuser -k 80/tcp || true');
        
        console.log('Restarting the Next App cleanly...\n');
        const output = await ssh.execCommand(
            'pm2 start npm --name "next-hud" -- start -- -p 80', 
            { cwd: '/opt/crm-cannabis-next' }
        );
        
        console.log(output.stdout);
        console.log(output.stderr);
        
        console.log('\nVPS is Resurrected.');
        process.exit(0);
    } catch(err) {
        console.error("SSH Error:", err);
    }
}
fixVps();
