const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    const code = `
const mqtt = require('mqtt');
const c = mqtt.connect('mqtt://127.0.0.1:1883');
c.on('connect', () => {
  c.subscribe('+/events/rpc');
  c.subscribe('cultivo/script_timers');
  console.log('Listening for MQTT events...');
});
c.on('message', (t, m) => {
  if (t.includes('rpc') && !m.toString().includes('NotifyStatus') && !m.toString().includes('NotifyEvent')) return;
  console.log('[' + new Date().toISOString() + '] Topic: ' + t + ' Payload: ' + m.toString());
});
setTimeout(() => process.exit(0), 10000);
`;
    await ssh.execCommand(`node -e "${code.replace(/"/g, '\\"').replace(/\n/g, '')}"`);
    console.log("Done");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
