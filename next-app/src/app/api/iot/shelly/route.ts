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
    let result: any;

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
      case 'get_config':
        result = await shelly.getSwitchConfig(0);
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
        const toggleParam = payload.targetDuration > 0 ? `, toggle_after: ${payload.targetDuration}` : '';
                if (payload.delaySeconds > 0) {
            let scriptCode = '';
            if (payload.delaySeconds > 3600) {
              // Robust script for delays > 1 hour
              scriptCode = `
                let State = { triggerTime: 0, triggered: false };
                Shelly.addEventHandler(function(event, ud) {
                  if (typeof event.info.state !== 'undefined' && event.component === 'switch:0') {
                    if (event.info.state === ${triggerState}) {
                      Shelly.call("Sys.GetStatus", {}, function(sys) {
                        if (sys.unixtime) { State.triggerTime = sys.unixtime; State.triggered = false; }
                      });
                    } else {
                      State.triggerTime = 0;
                    }
                  }
                });
                Timer.set(60000, true, function() {
                  if (State.triggerTime > 0 && !State.triggered) {
                    Shelly.call("Sys.GetStatus", {}, function(sys) {
                      if (sys.unixtime) {
                        if (sys.unixtime - State.triggerTime >= ${payload.delaySeconds}) {
                          State.triggered = true;
                          MQTT.publish("${payload.targetDeviceId}/rpc", JSON.stringify({id: 1, src: "${deviceId}", method: "Switch.Set", params: {id: 0, on: ${targetState}${toggleParam}}}));
                        }
                      }
                    });
                  }
                });
              `;
            } else {
              // Simple script for short delays
              scriptCode = `
                let State = { timerHandle: null };
                Shelly.addEventHandler(function(event, ud) {
                  if (typeof event.info.state !== 'undefined' && event.component === 'switch:0') {
                    if (event.info.state === ${triggerState}) {
                      State.timerHandle = Timer.set(${payload.delaySeconds * 1000}, false, function() {
                        MQTT.publish("${payload.targetDeviceId}/rpc", JSON.stringify({id: 1, src: "${deviceId}", method: "Switch.Set", params: {id: 0, on: ${targetState}${toggleParam}}}));
                      });
                    } else {
                      if (State.timerHandle !== null) {
                        Timer.clear(State.timerHandle);
                        State.timerHandle = null;
                      }
                    }
                  }
                });
              `;
            }
          const scriptCreateRes: any = await shelly.createScript('Sequence_' + Date.now());
          await shelly.putScriptCode(scriptCreateRes.id, scriptCode);
          await shelly.startScript(scriptCreateRes.id);
          result = { success: true };
        } else {
          // Secuencia instantanea
          const scriptCode = `
            Shelly.addEventHandler(function(event, ud) {
              if (typeof event.info.state !== 'undefined' && event.component === 'switch:0') {
                if (event.info.state === ${triggerState}) {
                  MQTT.publish("${payload.targetDeviceId}/rpc", JSON.stringify({id: 1, src: "${deviceId}", method: "Switch.Set", params: {id: 0, on: ${targetState}${toggleParam}}}));
                }
              }
            });
          `;
          const scriptName = payload.ruleName || ('Auto_' + Date.now());
          const scriptCreateRes: any = await shelly.createScript(scriptName.substring(0,25));
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
          let State = { expectedState: null, startTime: null };
          
          function evaluateCycle(sys_unixtime) {
              if (State.startTime === null) return;
              let elapsed = sys_unixtime - State.startTime;
              if (elapsed < 0) elapsed = 0;
              let mod = elapsed % totalSecs;
              let shouldBeOn = (mod < hoursOnSecs);
              
              if (State.expectedState !== shouldBeOn) {
                  State.expectedState = shouldBeOn;
                  Shelly.call("Switch.Set", { id: 0, on: shouldBeOn });
              }
          }
          
          Shelly.addEventHandler(function(event, ud) {
            if (typeof event.info.state !== 'undefined' && event.component === 'switch:0') {
               let actualState = event.info.state;
               if (State.expectedState !== null && actualState !== State.expectedState) {
                  Shelly.call("Sys.GetStatus", {}, function(sys) {
                    if (sys.unixtime) {
                        State.expectedState = actualState;
                        if (actualState === true) {
                           State.startTime = sys.unixtime;
                        } else {
                           State.startTime = sys.unixtime - hoursOnSecs;
                        }
                        Shelly.call("KVS.Set", { key: KVS_KEY, value: State.startTime });
                    }
                  });
               }
            }
          });
          
          function init() {
            Shelly.call("KVS.Get", { key: KVS_KEY }, function(res, err_code) {
              Shelly.call("Sys.GetStatus", {}, function(sys) {
                 if (!sys.unixtime) return;
                 if (err_code !== 0) {
                    State.startTime = sys.unixtime;
                    Shelly.call("KVS.Set", { key: KVS_KEY, value: State.startTime });
                 } else {
                    State.startTime = Number(res.value);
                 }
                 Shelly.call("Switch.GetStatus", { id: 0 }, function(sw) {
                    State.expectedState = sw.output;
                    evaluateCycle(sys.unixtime);
                 });
              });
            });
          }
          
          Timer.set(60000, true, function() {
            Shelly.call("Sys.GetStatus", {}, function(sys) {
              if (sys.unixtime) evaluateCycle(sys.unixtime);
            });
          });
          
          Timer.set(5000, false, function() { init(); });
        `;
        
        const photoScriptRes: any = await shelly.createScript('Photoperiod_' + payload.hoursOn + 'hON_' + payload.hoursOff + 'hOFF_' + Date.now());
        await shelly.putScriptCode(photoScriptRes.id, photoScript);
        await shelly.startScript(photoScriptRes.id);
        result = { success: true };
        break;

        break;

      case 'list_scripts':
        result = await shelly.listScripts();
        break;
      case 'get_script_code':
        result = await shelly['callRpc']('Script.GetCode', { id: Number(payload.scriptId) }); console.log('Script.GetCode result:', result);
        break;
      case 'start_script':
        result = await shelly.startScript(payload.id);
        break;
      case 'stop_script':
        result = await shelly.stopScript(payload.id);
        break;
      case 'delete_script':
        try { await shelly.stopScript(payload.id); } catch(e) {}
        result = await shelly['callRpc']('Script.Delete', { id: payload.id });
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
