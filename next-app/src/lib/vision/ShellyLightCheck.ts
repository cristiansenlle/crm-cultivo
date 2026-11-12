import mqtt from 'mqtt';
import { PlantGridLayout } from './PlantGridStore';

export interface ShellyDeviceStatus {
    device_id: string;
    name: string;
    room: string;
    is_on: boolean;
    online: boolean;
    temperature_c: number | null;
    last_event_at: string | null;
}

export interface ShellyCameraLinkStatus {
    linked_shelly_device_id: string;
    linked_shelly_name: string;
    is_on: boolean;
    online: boolean;
    temperature_c: number | null;
    last_event_at: string | null;
    only_capture_when_shelly_on: boolean;
    auto_capture_on_shelly_on: boolean;
    capture_enabled: boolean;
    captured_during_dark_cycle: boolean;
    rpi_sentinel_online: boolean;
    rpi_broadlink_online: boolean;
    available_shellys: ShellyDeviceStatus[];
}

export const KNOWN_SHELLY_RELAYS: { device_id: string; name: string; room: string }[] = [
    {
        device_id: 'shellyplus1-8813bf9f8878',
        name: 'Shelly Iluminación Carpa (8813bf9f8878)',
        room: 'Carpa Principal'
    },
    {
        device_id: 'shellyplus1-8813bf9fc354',
        name: 'Shelly Relé 1 (8813bf9fc354)',
        room: 'Sala / Carpa 1'
    },
    {
        device_id: 'shelly1g4-a085e3b53e7c',
        name: 'Shelly Gen4 Carpa 2 (a085e3b53e7c)',
        room: 'Carpa 2'
    }
];

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';

interface LiveMqttProbeResult {
    shellyOnline: Record<string, boolean>;
    shellyOutput: Record<string, boolean>;
    shellyTemp: Record<string, number>;
    sentinelHeartbeatSeen: boolean;
}

function probeLiveMqttShellyState(deviceIds: string[], timeoutMs = 850): Promise<LiveMqttProbeResult> {
    return new Promise((resolve) => {
        const result: LiveMqttProbeResult = {
            shellyOnline: {},
            shellyOutput: {},
            shellyTemp: {},
            sentinelHeartbeatSeen: false
        };

        const rpcSrc = 'vision_light_probe_' + Math.random().toString(16).slice(2, 7);
        let settled = false;

        const client = mqtt.connect(MQTT_BROKER, {
            clientId: rpcSrc,
            connectTimeout: timeoutMs
        });

        const finish = () => {
            if (settled) return;
            settled = true;
            try { client.end(true); } catch {}
            resolve(result);
        };

        const timer = setTimeout(finish, timeoutMs);

        client.on('connect', () => {
            const subs = [
                `${rpcSrc}/rpc`,
                'cultivo/camera/light_state',
                ...deviceIds.map(id => `${id}/online`),
                ...deviceIds.map(id => `${id}/status/switch:0`)
            ];
            client.subscribe(subs, { qos: 0 }, () => {
                deviceIds.forEach((id, idx) => {
                    client.publish(
                        `${id}/rpc`,
                        JSON.stringify({ id: idx + 1, src: rpcSrc, method: 'Switch.GetStatus', params: { id: 0 } })
                    );
                });
            });
        });

        client.on('message', (topic, message) => {
            const raw = message.toString();
            if (topic.endsWith('/online')) {
                const devId = topic.split('/')[0];
                result.shellyOnline[devId] = raw.trim() === 'true';
            } else if (topic.endsWith('/status/switch:0')) {
                const devId = topic.split('/')[0];
                try {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed.output === 'boolean') {
                        result.shellyOutput[devId] = parsed.output;
                    }
                    if (typeof parsed.temperature?.tC === 'number') {
                        result.shellyTemp[devId] = parsed.temperature.tC;
                    }
                } catch {}
            } else if (topic === `${rpcSrc}/rpc`) {
                try {
                    const parsed = JSON.parse(raw);
                    const devId = parsed.src;
                    if (devId && parsed.result) {
                        result.shellyOnline[devId] = true;
                        if (typeof parsed.result.output === 'boolean') {
                            result.shellyOutput[devId] = parsed.result.output;
                        }
                        if (typeof parsed.result.temperature?.tC === 'number') {
                            result.shellyTemp[devId] = parsed.result.temperature.tC;
                        }
                    }
                } catch {}
            }
        });

        client.on('error', () => {
            clearTimeout(timer);
            finish();
        });
    });
}

export async function getShellyCameraLinkStatus(
    plantGrid: PlantGridLayout,
    adminSupabase: any,
    latestPhotoCreatedAt?: string | null
): Promise<ShellyCameraLinkStatus> {
    const linkedId = plantGrid.linked_shelly_device_id || 'shellyplus1-8813bf9f8878';
    const onlyWhenOn = plantGrid.only_capture_when_shelly_on !== false;
    const autoOnTurnOn = plantGrid.auto_capture_on_shelly_on !== false;

    const deviceIds = Array.from(new Set([
        ...KNOWN_SHELLY_RELAYS.map(r => r.device_id),
        linkedId
    ]));

    // 1. Consultar logs recientes en Supabase (device_logs) y nombres personalizados
    const latestLogState: Record<string, { is_on: boolean; created_at: string }> = {};
    let photoTakenWhileOff = false;

    if (adminSupabase) {
        try {
            const { data: logs } = await adminSupabase
                .from('device_logs')
                .select('device_ip, event, created_at')
                .eq('source', 'mqtt_logger')
                .order('created_at', { ascending: false })
                .limit(60);

            if (Array.isArray(logs)) {
                for (const row of logs) {
                    const devIp = row.device_ip;
                    if (devIp && (row.event === 'on' || row.event === 'off')) {
                        if (!latestLogState[devIp]) {
                            latestLogState[devIp] = {
                                is_on: row.event === 'on',
                                created_at: row.created_at
                            };
                        }
                    }
                }

                // Verificar si la última foto fue tomada mientras el Shelly vinculado estaba APAGADO
                if (latestPhotoCreatedAt) {
                    const photoTime = new Date(latestPhotoCreatedAt).getTime();
                    const linkedLogs = logs.filter(
                        (r: any) => r.device_ip === linkedId && (r.event === 'on' || r.event === 'off')
                    );
                    // Buscar el evento inmediatamente anterior o igual a la hora de la foto
                    const logAtPhotoTime = linkedLogs.find(
                        (r: any) => new Date(r.created_at).getTime() <= photoTime + 5000
                    );
                    if (logAtPhotoTime && logAtPhotoTime.event === 'off') {
                        photoTakenWhileOff = true;
                    }
                }
            }
        } catch (e) {
            console.warn('[ShellyLightCheck] Error consultando device_logs:', e);
        }
    }

    // 2. Sondear estado en tiempo real vía MQTT RPC (Switch.GetStatus)
    const liveProbe = await probeLiveMqttShellyState(deviceIds, 800);

    const availableShellys: ShellyDeviceStatus[] = deviceIds.map(id => {
        const known = KNOWN_SHELLY_RELAYS.find(k => k.device_id === id);
        const logInfo = latestLogState[id];
        const liveOn = liveProbe.shellyOutput[id];
        const isOn = typeof liveOn === 'boolean' ? liveOn : (logInfo ? logInfo.is_on : false);
        const online = liveProbe.shellyOnline[id] ?? false;

        return {
            device_id: id,
            name: known ? known.name : `Shelly (${id})`,
            room: known ? known.room : 'Cultivo',
            is_on: isOn,
            online,
            temperature_c: liveProbe.shellyTemp[id] ?? null,
            last_event_at: logInfo ? logInfo.created_at : null
        };
    });

    const linkedObj = availableShellys.find(s => s.device_id === linkedId) || {
        device_id: linkedId,
        name: plantGrid.linked_shelly_name || `Shelly (${linkedId})`,
        room: 'Carpa Principal',
        is_on: false,
        online: false,
        temperature_c: null,
        last_event_at: null
    };

    const captureEnabled = !onlyWhenOn || linkedObj.is_on;

    return {
        linked_shelly_device_id: linkedObj.device_id,
        linked_shelly_name: plantGrid.linked_shelly_name || linkedObj.name,
        is_on: linkedObj.is_on,
        online: linkedObj.online,
        temperature_c: linkedObj.temperature_c,
        last_event_at: linkedObj.last_event_at,
        only_capture_when_shelly_on: onlyWhenOn,
        auto_capture_on_shelly_on: autoOnTurnOn,
        capture_enabled: captureEnabled,
        captured_during_dark_cycle: photoTakenWhileOff,
        rpi_sentinel_online: liveProbe.sentinelHeartbeatSeen,
        rpi_broadlink_online: true,
        available_shellys: availableShellys
    };
}
