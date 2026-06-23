import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const device_ip = searchParams.get('deviceId') || searchParams.get('device_ip');
    const event = searchParams.get('event');

    if (!adminSupabase) {
      return NextResponse.json({ success: false, error: 'Sin conexion a BD (Falta Service Key)' }, { status: 500 });
    }

    if (device_ip && event) {
      const { error } = await adminSupabase.from('device_logs').insert([{
        device_ip,
        event,
        source: 'webhook'
      }]);
      
      if (error) throw error;
      return NextResponse.json({ success: true, note: 'Saved via GET webhook' });
    }

    let query = adminSupabase.from('device_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (device_ip) query = query.eq('device_ip', device_ip);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const device_ip = searchParams.get('deviceId') || searchParams.get('device_ip');
    const event = searchParams.get('event');

    if (!device_ip || !event) {
      return NextResponse.json({ error: 'Faltan parmetros' }, { status: 400 });
    }

    if (!adminSupabase) {
      return NextResponse.json({ success: true, note: 'No guardado, falta DB' });
    }

    const { error } = await adminSupabase.from('device_logs').insert([{
      device_ip,
      event,
      source: 'webhook'
    }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
