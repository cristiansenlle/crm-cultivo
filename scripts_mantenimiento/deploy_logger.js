const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    const path = require('path');
    await ssh.putFile(path.join(__dirname, 'mqtt_logger.js'), '/opt/crm-cannabis-next/mqtt_dumper.js');
    await ssh.execCommand('pm2 restart mqtt_dumper');
    console.log("Deployed");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
