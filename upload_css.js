const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
  });
  
  await ssh.putFile(
    path.join(__dirname, 'style.css'),
    '/opt/crm-cannabis/style.css'
  );
  console.log('✅ style.css uploaded — light mode inputs fixed!');
  ssh.dispose();
}
run();
