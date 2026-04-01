const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    console.log('Uploading patched style.css to /opt/crm-cannabis root...');
    await ssh.putFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\style.css', '/opt/crm-cannabis/style.css');
    console.log('Upload complete! The production frontend is now synchronized.');
    ssh.dispose();
}).catch(console.error);
