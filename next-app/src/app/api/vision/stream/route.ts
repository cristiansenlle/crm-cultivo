import { NextRequest, NextResponse } from 'next/server';
import mqtt from 'mqtt';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
const VPS_PUBLIC_IP = '109.199.99.126';

function sendMqttCommand(topic: string, payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
        const client = mqtt.connect(MQTT_BROKER, {
            clientId: 'nextjs-vision-ctrl-' + Math.random().toString(16).substring(2, 8),
            connectTimeout: 4000
        });

        const timeout = setTimeout(() => {
            client.end();
            resolve(); // Continuar para no bloquear al usuario si el broker demora
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
            resolve(); // Fallback sin crash
        });
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const action = body.action || 'start'; // 'start', 'stop', 'snapshot'
        const duration = body.duration || 300; // 5 minutos por defecto

        if (action === 'start') {
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'stream_start',
                duration_sec: duration,
                target_url: `rtsp://${VPS_PUBLIC_IP}:8554/cultivo`,
                requested_at: new Date().toISOString()
            });

            return NextResponse.json({
                status: 'starting',
                webrtc_url: `http://${VPS_PUBLIC_IP}:8889/cultivo`,
                whep_url: `http://${VPS_PUBLIC_IP}:8889/cultivo/whep`,
                hls_url: `http://${VPS_PUBLIC_IP}:8888/cultivo/index.m3u8`,
                duration_sec: duration
            });
        } else if (action === 'stop') {
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'stream_stop',
                requested_at: new Date().toISOString()
            });

            return NextResponse.json({ status: 'stopped' });
        } else if (action === 'snapshot') {
            await sendMqttCommand('cultivo/camera/commands', {
                cmd: 'capture_now',
                requested_at: new Date().toISOString()
            });

            return NextResponse.json({ status: 'snapshot_requested' });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET() {
    // Retorna URLs del reproductor y estado del stream
    return NextResponse.json({
        webrtc_url: `http://${VPS_PUBLIC_IP}:8889/cultivo`,
        whep_url: `http://${VPS_PUBLIC_IP}:8889/cultivo/whep`,
        hls_url: `http://${VPS_PUBLIC_IP}:8888/cultivo/index.m3u8`,
        rtsp_input: `rtsp://${VPS_PUBLIC_IP}:8554/cultivo`
    });
}
