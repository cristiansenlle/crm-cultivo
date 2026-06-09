import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Leer el historial
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const device_ip = searchParams.get('deviceId') || searchParams.get('device_ip');
    const event = searchParams.get('event'); // "on" o "off"

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    // Si viene el parámetro event, significa que es un Webhook del Shelly (que envía GET)
    if (event && device_ip) {
      const { error } = await supabase.from('device_logs').insert([{
        device_ip,
        event,
        source: 'webhook'
      }]);
      if (error) throw error;
      return NextResponse.json({ success: true, note: 'Saved via GET webhook' });
    }

    // Si no viene event, significa que el frontend está leyendo el historial
    let query = supabase.from('device_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (device_ip) query = query.eq('device_ip', device_ip);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Recibir Webhooks del Shelly
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const device_ip = searchParams.get('deviceId') || searchParams.get('device_ip');
    const event = searchParams.get('event'); // "on" o "off"

    if (!device_ip || !event) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    if (!supabase) {
      console.warn("Webhook recibido pero Supabase no está configurado.");
      return NextResponse.json({ success: true, note: 'No guardado, falta DB' });
    }

    const { error } = await supabase.from('device_logs').insert([{
      device_ip,
      event,
      source: 'webhook'
    }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al guardar historial:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


