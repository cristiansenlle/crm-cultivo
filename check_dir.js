const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: '109.199.99.126',
    username: 'root',
    password: 'HIDDEN_SECRET_BY_AI'
  });

  const result = await ssh.execCommand('ls -la /opt/crm-cannabis');
  console.log('--- /opt/crm-cannabis ---');
  console.log(result.stdout);

  const result2 = await ssh.execCommand('ls -la /opt/crm-cannabis/"crm cannabis"');
  console.log('\n--- /opt/crm-cannabis/crm cannabis ---');
  console.log(result2.stdout);

  ssh.dispose();
}
run();
