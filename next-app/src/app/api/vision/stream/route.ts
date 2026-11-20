import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';
import { loadPlantGrid } from '@/lib/vision/PlantGridStore';
import { getShellyCameraLinkStatus } from '@/lib/vision/ShellyLightCheck';

export const dynamic = 'force-dynamic';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
const VPS_PUBLIC_IP = '109.199.99.126';
const MEDIAMTX_API_BASE = process.env.MEDIAMTX_API_URL || 'http://127.0.0.1:9997';
const SENTINEL_ANTI_DEADLOCK_DURATION_SEC = 864000; // 10 días para anular STREAM_EXPIRY local en RPi

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

interface CameraRuntimeStatus {
    rpi_online: boolean;
    last_heartbeat_at: string | null;
    streaming: boolean;
    cpu_temp: number | null;
    last_event: string | null;
    last_event_at: string | null;
    last_stream_start_at: string | null;
    last_capture_at: string | null;
    updated_at: string | null;
}

function getCameraRuntimeStatusPath(): string {
    if (fs.existsSync('/var/www/captures') || process.platform === 'linux') {
        return '/var/www/captures/crop_vision/camera_runtime_status.json';
    }
    return path.resolve(process.cwd(), 'public', 'captures', 'camera_runtime_status.json');
}

async function checkMediaMtxStreamReady(): Promise<{
    ready: boolean;
    readers: number;
    tracks: string[];
    bytesReceived: number;
}> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
        const res = await fetch(`${MEDIAMTX_API_BASE}/v3/paths/get/cultivo`, {
            cache: 'no-store',
            signal: controller.signal
        });
        if (!res.ok) {
            return { ready: false, readers: 0, tracks: [], bytesReceived: 0 };
        }
        const data = await res.json();
        return {
            ready: Boolean(data?.ready),
            readers: Array.isArray(data?.readers) ? data.readers.length : 0,
            tracks: Array.isArray(data?.tracks) ? data.tracks : [],
            bytesReceived: Number(data?.bytesReceived) || 0
        };
    } catch {
        return { ready: false, readers: 0, tracks: [], bytesReceived: 0 };
    } finally {
        clearTimeout(timeout);
    }
}

function readCameraRuntimeStatus(): CameraRuntimeStatus {
    const statusPath = getCameraRuntimeStatusPath();
    try {
        if (fs.existsSync(statusPath)) {
            const raw = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            const hbMs = raw?.last_heartbeat_at ? new Date(raw.last_heartbeat_at).getTime() : 0;
            const rpi_online = Boolean(hbMs && !Number.isNaN(hbMs) && (Date.now() - hbMs) < 45000);
            return {
                rpi_online,
                last_heartbeat_at: raw?.last_heartbeat_at || null,
                streaming: Boolean(raw?.streaming),
                cpu_temp: typeof raw?.cpu_temp === 'number' ? raw.cpu_temp : null,
                last_event: raw?.last_event || null,
                last_event_at: raw?.last_event_at || null,
                last_stream_start_at: raw?.last_stream_start_at || null,
                last_capture_at: raw?.last_capture_at || null,
                updated_at: raw?.updated_at || null
            };
        }
    } catch (e: any) {
        console.warn('[Vision Stream] Error leyendo camera_runtime_status.json:', e?.message);
    }
    return {
        rpi_online: false,
        last_heartbeat_at: null,
        streaming: false,
        cpu_temp: null,
        last_event: null,
        last_event_at: null,
        last_stream_start_at: null,
        last_capture_at: null,
        updated_at: null
    };
}

function sendMqttCommand(topic: string, payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
        const client = mqtt.connect(MQTT_BROKER, {
            clientId: 'nextjs-vision-ctrl-' + Math.random().toString(16).substring(2, 8),
            connectTimeout: 4000
        });

        const timeout = setTimeout(() => {
            client.end();
            resolve();
        }, 3000);

        client.on('connect', () => {
            client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
                clearTimeout(timeout);
                client.end();
                if (err) reject(err);
                else resolve();
            });
        });

        client.on('error', (err) => {
            clearTimeout(timeout);
            client.end();
            console.warn('[MQTT Stream Control] Error de conexión:', err.message);
            resolve();
        });
    });
}

function getStreamEndpoints() {
    return {
        webrtc_url: `http://${VPS_PUBLIC_IP}:8889/cultivo/`,
        whep_url: `http://${VPS_PUBLIC_IP}:8889/cultivo/whep`,
        hls_url: `http://${VPS_PUBLIC_IP}:8888/cultivo/index.m3u8`,
        rtsp_input: `rtsp://${VPS_PUBLIC_IP}:8554/cultivo`
    };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const action = body.action || 'start'; // 'start', 'stop', 'snapshot'
        const duration = Number(body.duration) || 240;

        const plantGrid = loadPlantGrid();
        const shellyLink = await getShellyCameraLinkStatus(plantGrid, adminSupabase);

        if (action === 'start') {
            // Enviar duration_sec = 864000 (10 días) para desactivar el auto-timeout con deadlock en RPi.
            // El cierre lo gestiona el navegador + watchdog de mqtt_logger en Contabo mediante stream_stop.
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'stream_start',
                duration_sec: SENTINEL_ANTI_DEADLOCK_DURATION_SEC,
                requested_duration_sec: duration,
                target_url: `rtsp://${VPS_PUBLIC_IP}:8554/cultivo`,
                shelly_id: shellyLink.linked_shelly_device_id,
                shelly_is_on: shellyLink.is_on,
                requested_at: new Date().toISOString()
            });

            let mtx = await checkMediaMtxStreamReady();
            const deadline = Date.now() + 6500;
            while (!mtx.ready && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 500));
                mtx = await checkMediaMtxStreamReady();
            }

            const runtime = readCameraRuntimeStatus();
            return NextResponse.json({
                status: mtx.ready ? 'streaming' : 'starting',
                ready: mtx.ready,
                tracks: mtx.tracks,
                bytesReceived: mtx.bytesReceived,
                readers: mtx.readers,
                rpi_online: mtx.ready ? true : runtime.rpi_online,
                camera_status: runtime,
                ...getStreamEndpoints(),
                duration_sec: duration,
                shelly_link: shellyLink
            });
        } else if (action === 'stop') {
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'stream_stop',
                reason: body.reason || 'client_stop',
                requested_at: new Date().toISOString()
            });

            return NextResponse.json({ status: 'stopped' });
        } else if (action === 'snapshot') {
            if (shellyLink.only_capture_when_shelly_on && !shellyLink.is_on && !body.force) {
                return NextResponse.json(
                    {
                        error: `El Shelly vinculado (${shellyLink.linked_shelly_name}) está APAGADO. La cámara solo captura fotos cuando el Shelly está encendido.`,
                        shelly_off: true,
                        shelly_link: shellyLink
                    },
                    { status: 409 }
                );
            }

            // Escudo Anti-Deadlock: detener stream fuera de STREAM_LOCK antes de disparar captura
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'stream_stop',
                reason: 'pre_snapshot_guard',
                requested_at: new Date().toISOString()
            });
            await new Promise(resolve => setTimeout(resolve, 2200));

            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'capture_now',
                trigger: 'manual',
                shelly_id: shellyLink.linked_shelly_device_id,
                shelly_is_on: shellyLink.is_on,
                requested_at: new Date().toISOString()
            });

            return NextResponse.json({
                status: 'snapshot_requested',
                shelly_link: shellyLink
            });
        }

        if (action === 'restart_camera' || action === 'reboot_rpi') {
            await sendMqttCommand('cultivo/rpi/admin', {
                action,
                requested_at: new Date().toISOString()
            });
            return NextResponse.json({ status: action + '_requested' });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET() {
    const [mtx, runtime] = await Promise.all([
        checkMediaMtxStreamReady(),
        Promise.resolve(readCameraRuntimeStatus())
    ]);

    return NextResponse.json({
        ready: mtx.ready,
        tracks: mtx.tracks,
        bytesReceived: mtx.bytesReceived,
        readers: mtx.readers,
        rpi_online: mtx.ready ? true : runtime.rpi_online,
        camera_status: runtime,
        ...getStreamEndpoints()
    });
}
