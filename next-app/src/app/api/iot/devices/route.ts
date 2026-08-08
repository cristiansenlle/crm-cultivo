import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Fallback devices en caso de que la base de datos falle o no esté lista
const FALLBACK_DEVICES = [
  { id: '1', name: 'Shelly Relé 1', type: 'shelly_1plus', ip: '192.168.0.53', device_id: 'shellyplus1-8813bf9fc354' },
  { id: '2', name: 'Shelly Relé 2', type: 'shelly_1plus', ip: '192.168.0.142', device_id: 'shellyplus1-8813bf9f8878' },
  { id: '3', name: 'Shelly H&T Gen3', type: 'shellyhtg3', ip: '192.168.0.190', device_id: 'shellyhtg3-d0cf13c2f578' },
  { id: '4', name: 'Nuevo Shelly (Carpa 2)', type: 'shelly1g4', ip: 'DHCP', device_id: 'shelly1g4-a085e3b53e7c' },
];

export async function GET() {
  try {
    const { data, error } = await supabase.from('core_iot_devices').select('*').order('created_at', { ascending: true });
    
    if (error) {
      console.warn("Supabase devices table might not exist yet. Using fallback.", error.message);
      return NextResponse.json({ success: true, data: FALLBACK_DEVICES });
    }

    if (!data || data.length === 0) {
      // Auto-migrate if table is empty
      const { error: insertErr } = await supabase.from('core_iot_devices').insert(FALLBACK_DEVICES.map(d => ({
        name: d.name,
        type: d.type,
        ip: d.ip,
        device_id: d.device_id
      })));
      if (!insertErr) {
        const { data: newData } = await supabase.from('core_iot_devices').select('*').order('created_at', { ascending: true });
        return NextResponse.json({ success: true, data: newData });
      }
      return NextResponse.json({ success: true, data: FALLBACK_DEVICES });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error fetching devices:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, ip, device_id, room_id } = body;

    const { data, error } = await supabase.from('core_iot_devices').insert([
      { name, type, ip: ip || 'DHCP', device_id, room_id: room_id || null }
    ]).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error adding device:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error("ID required");

    const { error } = await supabase.from('core_iot_devices').delete().eq('id', id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting device:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
