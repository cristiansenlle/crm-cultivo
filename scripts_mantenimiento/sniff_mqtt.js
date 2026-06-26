const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '109.199.99.126',
      username: 'root',
      password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });
    console.log('Sniffing MQTT on VPS...');
    const remoteScript = `
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://127.0.0.1:1883');
let count = 0;
client.on('connect', function() {
  client.subscribe('#');
});
client.on('message', function(topic, msg) {
  console.log(topic, msg.toString());
  count++;
  if(count >= 30) process.exit(0);
});
setTimeout(function() { process.exit(0); }, 15000);
`;
    await ssh.execCommand(`cat << 'EOF' > /opt/crm-cannabis-next/sniff.js\n${remoteScript}\nEOF`);
    let result = await ssh.execCommand('node sniff.js', { cwd: '/opt/crm-cannabis-next' });
    console.log(result.stdout);
    if(result.stderr) console.error(result.stderr);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
