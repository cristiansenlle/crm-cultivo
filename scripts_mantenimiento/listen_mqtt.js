const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    const code = `
const mqtt = require('mqtt');
const c = mqtt.connect('mqtt://127.0.0.1:1883');
c.on('connect', () => {
  c.subscribe('cultivo/script_timers');
  c.subscribe('+/events/rpc');
});
c.on('message', (t, m) => {
  if (t === 'cultivo/script_timers') console.log("TIMER:", m.toString());
  else if (t.includes('rpc') && m.toString().includes('NotifyStatus')) {
      const p = JSON.parse(m.toString());
      if (p.params && p.params['switch:0']) {
        console.log("NOTIFY:", t, p.params['switch:0']);
      }
  }
});
setTimeout(() => { process.exit(0); }, 15000);
`;
    const res = await ssh.execCommand(`node -e "${code.replace(/"/g, '\\"').replace(/\n/g, '')}"`);
    console.log(res.stdout);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
