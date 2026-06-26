const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://127.0.0.1:1883');

const deviceIds = new Set(['shellyplus1-8813bf9f8878', 'shellyplus1-8813bf9fc354']);

async function runMigration() {
  console.log("Discovering devices for 5 seconds...");
  
  const discoverHandler = (topic) => {
    const d = topic.split('/')[0];
    if (d.startsWith('shelly')) deviceIds.add(d);
  };
  client.subscribe('+/events/rpc');
  client.on('message', discoverHandler);
  
  await new Promise(r => setTimeout(r, 5000));
  client.removeListener('message', discoverHandler);
  client.unsubscribe('+/events/rpc');

  console.log("Found devices:", Array.from(deviceIds));

  for (const d of deviceIds) { await processDevice(d); }
  console.log('Done!'); process.exit(0);
}

function rpcCall(deviceId, method, params = {}) {
  return new Promise(resolve => {
    const reqId = Math.floor(Math.random() * 10000);
    const src = 'migrator_' + reqId;
    const timeout = setTimeout(() => { client.unsubscribe(src + '/rpc'); resolve(null); }, 5000);
    const handler = (t, m) => {
      const p = JSON.parse(m.toString());
      if (p.id === reqId && p.src === deviceId) { clearTimeout(timeout); client.unsubscribe(src + '/rpc'); client.removeListener('message', handler); resolve(p.result); }
    };
    client.subscribe(src + '/rpc');
    client.on('message', handler);
    client.publish(deviceId + '/rpc', JSON.stringify({ id: reqId, src, method, params }));
  });
}

async function processDevice(deviceId) {
  const res = await rpcCall(deviceId, 'Script.List');
  if (!res || !res.scripts) return;
  for (const s of res.scripts) {
    if (s.name.startsWith('Photoperiod_')) {
      console.log('Found:', s.name, 'on', deviceId);
      const c = await rpcCall(deviceId, 'Script.GetCode', { id: s.id });
      if (!c || !c.code) continue;
      let code = c.code;
      console.log("=== SCRIPT CODE ===");
      console.log(code);
      console.log("===================");
      if (code.includes('cultivo/script_timers')) { console.log('Already migrated'); continue; }
      const oldFunc = 'if (State.expectedState !== shouldBeOn) {\n                  State.expectedState = shouldBeOn;\n                  Shelly.call("Switch.Set", { id: 0, on: shouldBeOn });\n              }';
      const newFunc = 'if (State.expectedState !== shouldBeOn) {\n                  State.expectedState = shouldBeOn;\n                  let next_epoch = sys_unixtime + (shouldBeOn ? (hoursOnSecs - mod) : (totalSecs - mod));\n                  MQTT.publish("cultivo/script_timers", JSON.stringify({ deviceId: Shelly.getDeviceInfo().id, next_epoch: next_epoch }));\n                  Shelly.call("Switch.Set", { id: 0, on: shouldBeOn });\n              }';
      if (code.includes(oldFunc)) {
        code = code.replace(oldFunc, newFunc);
        await rpcCall(deviceId, 'Script.Stop', { id: s.id });
        await rpcCall(deviceId, 'Script.PutCode', { id: s.id, code });
        await rpcCall(deviceId, 'Script.Start', { id: s.id });
        console.log('Patched!');
      } else { console.log('Code mismatch!'); }
    }
  }
}
setTimeout(runMigration, 1000);
