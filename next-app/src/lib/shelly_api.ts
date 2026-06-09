import mqtt from 'mqtt';

export interface ShellyResponse<T> {
  id: number;
  src: string;
  dst: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

// Para desarrollo local usamos la IP de Contabo, en producción (VPS) usamos localhost
const MQTT_BROKER = process.env.NODE_ENV === 'production' ? 'mqtt://127.0.0.1:1883' : 'mqtt://109.199.99.126:1883';

export class ShellyAPI {
  private deviceId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  private async callRpc<T>(method: string, params: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect(MQTT_BROKER);
      const reqId = Date.now() % 10000;
      const srcTopic = `nextjs_app_${reqId}`;
      const destTopic = `${this.deviceId}/rpc`;

      // Timeout de 5 segundos
      const timeout = setTimeout(() => {
        client.end();
        reject(new Error("MQTT RPC Timeout"));
      }, 5000);

      client.on('connect', () => {
        client.subscribe(srcTopic + '/rpc', (err) => {
          if (err) {
            clearTimeout(timeout);
            client.end();
            return reject(err);
          }
          
          const payload = JSON.stringify({
            id: reqId,
            src: srcTopic,
            method: method,
            params: params
          });
          
          client.publish(destTopic, payload);
        });
      });

      client.on('message', (topic, message) => {
        if (topic === srcTopic + '/rpc') {
          clearTimeout(timeout);
          client.end();
          try {
            const data: ShellyResponse<T> = JSON.parse(message.toString());
            if (data.error) reject(new Error(`Shelly RPC Error ${data.error.code}: ${data.error.message}`));
            else resolve(data.result as T);
          } catch (e) {
            reject(e);
          }
        }
      });
    });
  }

  // --- Device Info ---
  async getStatus() { return this.callRpc('Shelly.GetStatus'); }
  async getDeviceInfo() { return this.callRpc('Shelly.GetDeviceInfo'); }

  // --- Sys & Wifi ---
  async setName(name: string) {
    return this.callRpc('Sys.SetConfig', { config: { device: { name } } });
  }

  async setWifi(ssid: string, pass: string) {
    return this.callRpc('Wifi.SetConfig', {
      config: { sta1: { ssid, pass, enable: true } }
    });
  }

  // --- Switch Control ---
  async toggleSwitch(id: number = 0, on: boolean) {
    return this.callRpc('Switch.Set', { id, on });
  }

  async setSwitchConfig(id: number = 0, config: any) {
    return this.callRpc('Switch.SetConfig', { id, config });
  }

  // --- Scripts ---
  async listScripts() { return this.callRpc('Script.List'); }
  async createScript(name: string) { return this.callRpc('Script.Create', { name }); }
  async putScriptCode(id: number, code: string) { return this.callRpc('Script.PutCode', { id, code }); }
  async startScript(id: number) { return this.callRpc('Script.Start', { id }); }
  async stopScript(id: number) { return this.callRpc('Script.Stop', { id }); }

  // --- Scheduling ---
  async createSchedule(enable: boolean, timespec: string, calls: any[]) {
    return this.callRpc('Schedule.Create', { enable, timespec, calls });
  }

  async listSchedules() {
    return this.callRpc('Schedule.List');
  }

  async deleteSchedule(id: number) {
    return this.callRpc('Schedule.Delete', { id });
  }
}
