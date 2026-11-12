import { NextRequest, NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';
import { loadPlantGrid } from '@/lib/vision/PlantGridStore';
import { getShellyCameraLinkStatus } from '@/lib/vision/ShellyLightCheck';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
const VPS_PUBLIC_IP = '109.199.99.126';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

function sendMqttCommand(topic: string, payload: any): Promise<void> {
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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const action = body.action || 'start'; // 'start', 'stop', 'snapshot'
        const duration = body.duration || 300; // 5 minutos por defecto

        const plantGrid = loadPlantGrid();
        const shellyLink = await getShellyCameraLinkStatus(plantGrid, adminSupabase);

        if (action === 'start') {
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'stream_start',
                duration_sec: duration,
                target_url: `rtsp://${VPS_PUBLIC_IP}:8554/cultivo`,
                shelly_id: shellyLink.linked_shelly_device_id,
                shelly_is_on: shellyLink.is_on,
                requested_at: new Date().toISOString()
            });

            return NextResponse.json({
                status: 'starting',
                webrtc_url: `http://${VPS_PUBLIC_IP}:8889/cultivo`,
                whep_url: `http://${VPS_PUBLIC_IP}:8889/cultivo/whep`,
                hls_url: `http://${VPS_PUBLIC_IP}:8888/cultivo/index.m3u8`,
                duration_sec: duration,
                shelly_link: shellyLink
            });
        } else if (action === 'stop') {
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'stream_stop',
                requested_at: new Date().toISOString()
            });

            return NextResponse.json({ status: 'stopped' });
        } else if (action === 'snapshot') {
            // Verificar si el Shelly vinculado está encendido
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
    return NextResponse.json({
        webrtc_url: `http://${VPS_PUBLIC_IP}:8889/cultivo`,
        whep_url: `http://${VPS_PUBLIC_IP}:8889/cultivo/whep`,
        hls_url: `http://${VPS_PUBLIC_IP}:8888/cultivo/index.m3u8`,
        rtsp_input: `rtsp://${VPS_PUBLIC_IP}:8554/cultivo`
    });
}
