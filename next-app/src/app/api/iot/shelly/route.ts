import { NextResponse } from 'next/server';
import { ShellyAPI } from '@/lib/shelly_api';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, action, payload } = body;

    if (!deviceId || !action) {
      return NextResponse.json({ error: 'Missing deviceId or action' }, { status: 400 });
    }

    const shelly = new ShellyAPI(deviceId);
    let result;

    switch (action) {
      case 'status':
        result = await shelly.getStatus();
        const info = await shelly.getDeviceInfo();
        result = { ...result, device_info: info };
        break;
      case 'toggle':
        result = await shelly.toggleSwitch(0, payload.on);
        break;
      case 'set_name':
        result = await shelly.setName(payload.name);
        break;
      case 'set_wifi':
        result = await shelly.setWifi(payload.ssid, payload.password);
        break;
      case 'set_timers':
        result = await shelly.setSwitchConfig(0, {
          initial_state: "restore_last",
          auto_on: payload.auto_on,
          auto_on_delay: payload.auto_on_delay,
          auto_off: payload.auto_off,
          auto_off_delay: payload.auto_off_delay
        });
        break;
      case 'create_sequence':
        const triggerState = payload.trigger === 'on' ? 'true' : 'false';
        const targetState = payload.targetAction === 'on' ? 'true' : 'false';
        if (payload.delaySeconds > 0) {
          const scriptCode = `
            Shelly.addEventHandler(function(event, ud) {
              if (typeof event.info.state !== 'undefined' && event.component === 'switch:0') {
                if (event.info.state === ${triggerState}) {
                  Timer.set(${payload.delaySeconds * 1000}, false, function() {
                    MQTT.publish("${payload.targetDeviceId}/rpc", JSON.stringify({id: 1, src: "${deviceId}", method: "Switch.Set", params: {id: 0, on: ${targetState}}}));
                  });
                }
              }
            });
          `;
          const scriptCreateRes: any = await shelly.createScript('Sequence_' + Date.now());
          await shelly.putScriptCode(scriptCreateRes.id, scriptCode);
          await shelly.startScript(scriptCreateRes.id);
          result = { success: true };
        } else {
          // Secuencia instantánea (usamos script también, sin webhooks)
          const scriptCode = `
            Shelly.addEventHandler(function(event, ud) {
              if (typeof event.info.state !== 'undefined' && event.component === 'switch:0') {
                if (event.info.state === ${triggerState}) {
                  MQTT.publish("${payload.targetDeviceId}/rpc", JSON.stringify({id: 1, src: "${deviceId}", method: "Switch.Set", params: {id: 0, on: ${targetState}}}));
                }
              }
            });
          `;
          const scriptCreateRes: any = await shelly.createScript('SeqInst_' + Date.now());
          await shelly.putScriptCode(scriptCreateRes.id, scriptCode);
          await shelly.startScript(scriptCreateRes.id);
          result = { success: true };
        }
        break;

      case 'create_photoperiod':
        const hoursOnSecs = payload.hoursOn * 3600;
        const hoursOffSecs = payload.hoursOff * 3600;
        const totalSecs = hoursOnSecs + hoursOffSecs;
        
        const photoScript = `
          let KVS_KEY = "photo_start_" + ${Date.now()};
          let hoursOnSecs = ${hoursOnSecs};
          let totalSecs = ${totalSecs};
          
          function evaluateCycle(startTime) {
            Shelly.call("Sys.GetStatus", {}, function(sys) {
              if (!sys.unixtime) return; // Esperar sincronizacion NTP
              let elapsed = sys.unixtime - startTime;
              if (elapsed < 0) elapsed = 0;
              
              let mod = elapsed % totalSecs;
              let shouldBeOn = (mod < hoursOnSecs);
              
              Shelly.call("Switch.Set", { id: 0, on: shouldBeOn });
            });
          }
          
          function init() {
            Shelly.call("KVS.Get", { key: KVS_KEY }, function(res, err_code) {
              if (err_code !== 0) {
                // No existe, crear nuevo inicio
                Shelly.call("Sys.GetStatus", {}, function(sys) {
                   if (!sys.unixtime) return; // Esperar NTP en el proximo loop
                   Shelly.call("KVS.Set", { key: KVS_KEY, value: sys.unixtime });
                   evaluateCycle(sys.unixtime);
                });
              } else {
                let startTime = Number(res.value);
                evaluateCycle(startTime);
              }
            });
          }
          
          // Ejecutar chequeo cada 1 minuto (60000 ms)
          Timer.set(60000, true, function() {
            init();
          });
          
          // Ejecutar chequeo inicial en 5 segundos
          Timer.set(5000, false, function() {
            init();
          });
        `;
        
        const photoScriptRes: any = await shelly.createScript('Photoperiod_' + Date.now());
        await shelly.putScriptCode(photoScriptRes.id, photoScript);
        await shelly.startScript(photoScriptRes.id);
        result = { success: true };
        break;

      case 'list_scripts':
        result = await shelly.listScripts();
        break;
      case 'delete_script':
        try { await shelly.stopScript(payload.id); } catch(e) {}
        result = await shelly.callRpc('Script.Delete', { id: payload.id });
        break;

      case 'list_schedules':
        result = await shelly.listSchedules();
        break;
      case 'create_schedule':
        result = await shelly.createSchedule(true, payload.timespec, [{
          method: "Switch.Set",
          params: { id: 0, on: payload.on }
        }]);
        break;
      case 'delete_schedule':
        result = await shelly.deleteSchedule(payload.id);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
