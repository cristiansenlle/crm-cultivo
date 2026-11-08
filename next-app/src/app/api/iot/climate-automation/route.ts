import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Obtiene perfiles, reglas, comandos disponibles y logs recientes
export async function GET() {
  try {
    const [profilesRes, rulesRes, commandsRes, logsRes, telemetryRes, devicesRes, deviceLogsRes] = await Promise.all([
      supabase.from('climate_profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('climate_automation_rules').select('*, broadlink_commands(id, name)').order('created_at', { ascending: true }),
      supabase.from('broadlink_commands').select('id, name, hex_code').order('created_at', { ascending: false }),
      supabase.from('climate_automation_logs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('daily_telemetry').select('*').order('created_at', { ascending: false }).limit(1),
      supabase.from('core_iot_devices').select('*'),
      supabase.from('device_logs').select('*').eq('source', 'mqtt_logger').order('created_at', { ascending: false }).limit(5)
    ]);

    const latestLightLog = deviceLogsRes.data?.[0];
    const isLightOn = latestLightLog ? (latestLightLog.event === 'on') : true;

    return NextResponse.json({
      success: true,
      profiles: profilesRes.data || [],
      rules: rulesRes.data || [],
      commands: commandsRes.data || [],
      logs: logsRes.data || [],
      latestTelemetry: telemetryRes.data?.[0] || null,
      devices: devicesRes.data || [],
      isLightOn: isLightOn
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Actualiza perfiles, reglas o activa/desactiva automatización
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'save_profile') {
      const { profile } = body;
      if (profile.id) {
        const { error } = await supabase.from('climate_profiles').update(profile).eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('climate_profiles').insert([profile]);
        if (error) throw error;
      }
      return NextResponse.json({ success: true, message: 'Perfil guardado con éxito' });
    }

    if (action === 'set_active_profile') {
      const { profileId } = body;
      await supabase.from('climate_profiles').update({ is_active: false }).neq('id', profileId);
      const { error } = await supabase.from('climate_profiles').update({ is_active: true }).eq('id', profileId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Perfil activado' });
    }

    if (action === 'save_rule') {
      const { rule } = body;
      if (rule.id) {
        const { error } = await supabase.from('climate_automation_rules').update(rule).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('climate_automation_rules').insert([rule]);
        if (error) throw error;
      }
      return NextResponse.json({ success: true, message: 'Regla guardada con éxito' });
    }

    if (action === 'toggle_rule') {
      const { ruleId, isActive } = body;
      const { error } = await supabase.from('climate_automation_rules').update({ is_active: isActive }).eq('id', ruleId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Estado de regla actualizado' });
    }

    if (action === 'delete_rule') {
      const { ruleId } = body;
      const { error } = await supabase.from('climate_automation_rules').delete().eq('id', ruleId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Regla eliminada' });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
