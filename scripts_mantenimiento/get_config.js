const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });
    const code = `
const mqtt = require('mqtt');
const c = mqtt.connect('mqtt://127.0.0.1:1883');
c.on('connect', () => {
  c.publish('shellyplus1-8813bf9f8878/rpc', JSON.stringify({id:1,src:'tester',method:'Switch.GetConfig',params:{id:0}}));
  c.publish('shellyplus1-8813bf9fc354/rpc', JSON.stringify({id:1,src:'tester',method:'Switch.GetConfig',params:{id:0}}));
});
c.subscribe('tester/rpc');
c.on('message', (t, m) => {
  console.log(m.toString());
});
setTimeout(() => process.exit(0), 3000);
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
