import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzePhytoElectrophysiology, BioelectricRecord } from '../../../../lib/electrophysiology/PhytoDiagnosticEngine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Credenciales de Supabase no configuradas en variables de entorno' },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('room_id') || '5a650ff8-9b93-40cc-a7f9-c672bad50014'; // Default Carpa 2
    const batchId = searchParams.get('batch_id');
    const soilSensorIdCh1 = searchParams.get('soil_sensor_id_ch1') || searchParams.get('soil_sensor_id');
    const soilSensorIdCh2 = searchParams.get('soil_sensor_id_ch2');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // 1. Consultar Telemetría de Electrofisiología desde device_logs
    const { data: rawBioLogs, error: bioError } = await supabase
      .from('device_logs')
      .select('id, device_ip, event, created_at')
      .eq('source', 'plant_electrophysiology')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bioError) {
      console.error('Error fetching electrophysiology logs:', bioError.message);
    }

    const bioTelemetry: BioelectricRecord[] = (rawBioLogs || []).map(row => {
      try {
        const parsed = typeof row.event === 'string' ? JSON.parse(row.event) : row.event;
        return {
          mac: parsed.mac || row.device_ip || 'ESP32-Phyto',
          room_id: parsed.room_id || roomId,
          plant_tag: parsed.plant_tag || 'Carpa2_PlantaCentinela_01',
          voltage_mv: Number(parsed.voltage_mv) || (parsed.ch1 ? Number(parsed.ch1.voltage_mv) : 0),
          baseline_mv: Number(parsed.baseline_mv) || (parsed.ch1 ? Number(parsed.ch1.baseline_mv) : 1650),
          stress_index: Number(parsed.stress_index) || (parsed.ch1 ? Number(parsed.ch1.stress_index) : 0),
          event: parsed.event || (parsed.ch1 ? parsed.ch1.event : 'steady'),
          ch1: parsed.ch1 ? {
            voltage_mv: Number(parsed.ch1.voltage_mv) || 0,
            baseline_mv: Number(parsed.ch1.baseline_mv) || 1650,
            stress_index: Number(parsed.ch1.stress_index) || 0,
            event: parsed.ch1.event || 'steady'
          } : undefined,
          ch2: parsed.ch2 ? {
            voltage_mv: Number(parsed.ch2.voltage_mv) || 0,
            baseline_mv: Number(parsed.ch2.baseline_mv) || 1650,
            stress_index: Number(parsed.ch2.stress_index) || 0,
            event: parsed.ch2.event || 'steady'
          } : undefined,
          ads_online: parsed.ads_online !== false,
          timestamp: parsed.timestamp || row.created_at
        };
      } catch (e) {
        return {
          mac: row.device_ip || 'ESP32-Phyto',
          room_id: roomId,
          plant_tag: 'Carpa2_PlantaCentinela_01',
          voltage_mv: 1640,
          baseline_mv: 1640,
          stress_index: 0,
          event: 'steady',
          ads_online: true,
          timestamp: row.created_at
        };
      }
    });

    // 2. Consultar Telemetría de Suelo para Maceta 1 (CH1) y Maceta 2 (CH2)
    let soilTelemetryCh1: any[] = [];
    let soilTelemetryCh2: any[] = [];

    // Resolver sensores de la sala si no se especificaron
    const { data: roomSensors } = await supabase
      .from('core_soil_sensors')
      .select('id, name, pin_index')
      .eq('room_id', roomId)
      .order('pin_index', { ascending: true })
      .limit(6);

    const targetSensorCh1 = soilSensorIdCh1 || (roomSensors && roomSensors.length > 0 ? roomSensors[0].id : null);
    const targetSensorCh2 = soilSensorIdCh2 || (roomSensors && roomSensors.length > 1 ? roomSensors[1].id : targetSensorCh1);

    if (targetSensorCh1) {
      const { data: s1Data } = await supabase
        .from('soil_telemetry')
        .select('sensor_id, moisture_pct, created_at')
        .eq('sensor_id', targetSensorCh1)
        .order('created_at', { ascending: false })
        .limit(80);
      soilTelemetryCh1 = s1Data || [];
    }

    if (targetSensorCh2 && targetSensorCh2 !== targetSensorCh1) {
      const { data: s2Data } = await supabase
        .from('soil_telemetry')
        .select('sensor_id, moisture_pct, created_at')
        .eq('sensor_id', targetSensorCh2)
        .order('created_at', { ascending: false })
        .limit(80);
      soilTelemetryCh2 = s2Data || [];
    } else if (targetSensorCh2 === targetSensorCh1) {
      soilTelemetryCh2 = [...soilTelemetryCh1];
    }

    // 3. Consultar Clima y VPD Foliar
    const { data: climateData } = await supabase
      .from('daily_telemetry')
      .select('temperature_c, humidity_percent, vpd_leaf_kpa, vpd_ambient_kpa, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(60);

    // 4. Consultar Eventos Agronómicos e Insumos de Bodega
    let agronomicEvents: any[] = [];
    const { data: eventsData } = await supabase
      .from('core_agronomic_events')
      .select(`
        id, event_type, description, date_occurred, water_liters, amount_applied, product_id,
        core_inventory_quimicos ( name, type )
      `)
      .order('date_occurred', { ascending: false })
      .limit(30);

    if (eventsData) {
      agronomicEvents = eventsData.map((e: any) => ({
        id: e.id,
        event_type: e.event_type,
        description: e.description,
        date_occurred: e.date_occurred,
        water_liters: e.water_liters,
        amount_applied: e.amount_applied,
        product_id: e.product_id,
        product_name: e.core_inventory_quimicos?.name,
        product_type: e.core_inventory_quimicos?.type
      }));
    }

    // 5. Consultar Contexto del Lote Activo
    let batchContext = null;
    let targetBatchId = batchId;

    if (!targetBatchId) {
      const { data: activeBatches } = await supabase
        .from('core_batches')
        .select('*')
        .eq('room_id', roomId)
        .limit(1);
      if (activeBatches && activeBatches.length > 0) {
        targetBatchId = activeBatches[0].id;
      }
    }

    if (targetBatchId) {
      const { data: batchData } = await supabase
        .from('core_batches')
        .select('*')
        .eq('id', targetBatchId)
        .single();

      if (batchData) {
        const lastStage = batchData.last_stage_date ? new Date(batchData.last_stage_date).getTime() : new Date(batchData.start_date).getTime();
        const daysInStage = Math.max(1, Math.floor((Date.now() - lastStage) / (1000 * 3600 * 24)));

        batchContext = {
          id: batchData.id,
          strain: batchData.strain || 'Desconocida',
          stage: batchData.stage || 'vegetativo',
          days_in_stage: daysInStage,
          light_hours: Number(batchData.light_hours) || 18,
          dark_hours: Number(batchData.dark_hours) || 6
        };
      }
    }

    // 6. Consultar Análisis de Imágenes IA
    const { data: imageData } = await supabase
      .from('core_image_analyses')
      .select('health_score, issues_detected, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 7. Consultar Protocolos
    const { data: protocolsData } = await supabase
      .from('core_protocols')
      .select('id, title, stage, content')
      .limit(10);

    // 8. Consultar Eventos de Dispositivos (Shelly on/off)
    const { data: deviceLogs } = await supabase
      .from('device_logs')
      .select('device_ip, event, created_at')
      .neq('source', 'plant_electrophysiology')
      .order('created_at', { ascending: false })
      .limit(40);

    // 9. Ejecutar Motor de Diagnóstico Phyto
    const analysis = analyzePhytoElectrophysiology({
      bioTelemetry,
      soilTelemetry: soilTelemetryCh1 || [],
      soilTelemetryCh1: soilTelemetryCh1 || [],
      soilTelemetryCh2: soilTelemetryCh2 || [],
      climateTelemetry: climateData || [],
      agronomicEvents,
      batchContext,
      imageAnalyses: imageData || [],
      protocols: protocolsData || [],
      deviceEvents: deviceLogs || []
    });

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error: any) {
    console.error('Error in Phyto Electrophysiology API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
