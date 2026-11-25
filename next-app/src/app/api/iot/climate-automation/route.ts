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
      supabase
        .from('climate_automation_rules')
        .select('*, broadlink_commands(id, name, hex_code, device_ip)')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.from('broadlink_commands').select('id, name, hex_code, device_ip').order('created_at', { ascending: false }),
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
      const { profile, activate } = body;
      const shouldActivate = Boolean(activate ?? profile?.is_active);
      const cleanProfile = {
        name: profile.name,
        phase: profile.phase || 'vegetative',
        is_active: shouldActivate,
        day_temp_min: Number(profile.day_temp_min),
        day_temp_max: Number(profile.day_temp_max),
        day_humidity_min: Number(profile.day_humidity_min),
        day_humidity_max: Number(profile.day_humidity_max),
        day_vpd_min: Number(profile.day_vpd_min),
        day_vpd_max: Number(profile.day_vpd_max),
        night_temp_min: Number(profile.night_temp_min),
        night_temp_max: Number(profile.night_temp_max),
        night_humidity_min: Number(profile.night_humidity_min),
        night_humidity_max: Number(profile.night_humidity_max),
        night_vpd_min: Number(profile.night_vpd_min),
        night_vpd_max: Number(profile.night_vpd_max),
      };

      if (profile.id) {
        if (shouldActivate) {
          await supabase.from('climate_profiles').update({ is_active: false }).neq('id', profile.id);
        }
        const { data, error } = await supabase
          .from('climate_profiles')
          .update(cleanProfile)
          .eq('id', profile.id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ success: true, profile: data, message: 'Perfil guardado con éxito' });
      } else {
        if (shouldActivate) {
          await supabase.from('climate_profiles').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
        }
        const { data, error } = await supabase
          .from('climate_profiles')
          .insert([cleanProfile])
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ success: true, profile: data, message: 'Nuevo perfil creado con éxito' });
      }
    }

    if (action === 'set_active_profile') {
      const { profileId } = body;
      await supabase.from('climate_profiles').update({ is_active: false }).neq('id', profileId);
      const { error } = await supabase.from('climate_profiles').update({ is_active: true }).eq('id', profileId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Perfil activado' });
    }

    if (action === 'delete_profile') {
      const { profileId } = body;
      const { data: allProfiles, error: listError } = await supabase.from('climate_profiles').select('id, is_active');
      if (listError) throw listError;
      if (!allProfiles || allProfiles.length <= 1) {
        return NextResponse.json({ success: false, error: 'No puedes eliminar el único perfil existente.' }, { status: 400 });
      }
      const target = allProfiles.find(p => p.id === profileId);
      if (!target) {
        return NextResponse.json({ success: false, error: 'Perfil no encontrado.' }, { status: 404 });
      }
      if (target.is_active) {
        return NextResponse.json({ success: false, error: 'Activa otro perfil antes de eliminar el perfil activo.' }, { status: 400 });
      }
      const { error } = await supabase.from('climate_profiles').delete().eq('id', profileId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Perfil eliminado con éxito' });
    }

    if (action === 'save_rule') {
      const { rule } = body;
      const cleanRule = {
        profile_id: rule.profile_id || null,
        name: String(rule.name || '').trim(),
        mode: rule.mode || 'both',
        target_parameter: rule.target_parameter || 'temperature',
        condition: rule.condition || 'greater_than',
        threshold_source: rule.threshold_source || 'manual',
        threshold_value: Number.isFinite(Number(rule.threshold_value)) ? Number(rule.threshold_value) : 0,
        hysteresis: Number.isFinite(Number(rule.hysteresis)) ? Number(rule.hysteresis) : 1.0,
        cooldown_minutes: Number.isFinite(Number(rule.cooldown_minutes)) ? parseInt(String(rule.cooldown_minutes), 10) : 10,
        priority: Number.isFinite(Number(rule.priority)) ? parseInt(String(rule.priority), 10) : 10,
        secondary_parameter: rule.secondary_parameter || null,
        secondary_condition: rule.secondary_parameter ? (rule.secondary_condition || 'gte') : null,
        secondary_threshold_source: rule.secondary_parameter ? (rule.secondary_threshold_source || 'profile_min') : 'manual',
        secondary_threshold_value:
          rule.secondary_parameter && rule.secondary_threshold_value !== null && rule.secondary_threshold_value !== undefined && rule.secondary_threshold_value !== ''
            ? Number(rule.secondary_threshold_value)
            : null,
        action_type: rule.action_type || 'auto',
        command_id: rule.command_id || null,
        is_active: rule.is_active !== false,
      };

      if (rule.id) {
        const { error } = await supabase.from('climate_automation_rules').update(cleanRule).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('climate_automation_rules').insert([cleanRule]);
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
