const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkBotJS() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('Finding bot path...');
    let res = await ssh.execCommand('pm2 jlist');
    
    try {
        const apps = JSON.parse(res.stdout);
        const botApp = apps.find(a => a.name === 'whatsapp-bot');
        if (botApp) {
            console.log('Bot path:', botApp.pm2_env.pm_exec_path);
            
            // Now let's just grab the file
            await ssh.getFile(
                require('path').join(__dirname, 'downloaded_bot.js'),
                botApp.pm2_env.pm_exec_path
            );
            console.log('Downloaded bot script successfully!');
            
        } else {
            console.log('Bot app not found in pm2 jlist');
        }
    } catch(e) {
        console.log('Error parsing pm2 jlist:', e.message);
    }

    ssh.dispose();
}

checkBotJS().catch(console.error);
