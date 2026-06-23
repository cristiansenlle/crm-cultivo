import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://109.199.99.126:1883'; // Contabo VPS

export async function POST(req: Request) {
  try {
    const { topic, message } = await req.json();

    if (!topic || !message) {
      return NextResponse.json({ error: 'Topic and message are required' }, { status: 400 });
    }

    return new Promise<Response>((resolve) => {
      const client = mqtt.connect(MQTT_BROKER, {
          clientId: `nextjs-publisher-${Math.random().toString(16).slice(2, 8)}`,
          connectTimeout: 5000,
      });

      client.on('connect', () => {
        client.publish(topic, message, (err) => {
          client.end();
          if (err) {
            resolve(NextResponse.json({ error: 'Failed to publish' }, { status: 500 }));
          } else {
            resolve(NextResponse.json({ success: true }));
          }
        });
      });

      client.on('error', (err) => {
        client.end();
        resolve(NextResponse.json({ error: 'MQTT Connection error' }, { status: 500 }));
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
