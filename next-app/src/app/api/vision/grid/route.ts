import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getShellyCameraLinkStatus, KNOWN_SHELLY_RELAYS } from '@/lib/vision/ShellyLightCheck';
import { VisionAgentEngine } from '@/lib/vision/VisionAgentEngine';
import {
    loadPlantGrid,
    savePlantGrid,
    reconcilePerPlantAnalysis,
    getDefaultGridLayout,
    getTemplateGridLayout,
    PlantGridLayout,
    DEFAULT_SOIL_SENSORS,
    SoilSensorOption
} from '@/lib/vision/PlantGridStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function GET() {
    try {
        const grid = loadPlantGrid();

        let availableStrains: string[] = ['Nicole Punch', 'Tropicanna WFC', 'Red Hot Cookies', 'Gorilla Glue #4', 'Amnesia Haze', 'OG Kush'];
        let latestPerPlant: any[] = [];
        let latestImageUrl: string | null = null;
        let cropDetected = false;
        let soilSensors: SoilSensorOption[] = [...DEFAULT_SOIL_SENSORS];

        if (adminSupabase) {
            try {
                // 1. Consultar placas ESP32 y los 10 sensores de humedad reales desde Supabase
                const [{ data: boardsData }, { data: sensorsData }, { data: telemetryData }] = await Promise.all([
                    adminSupabase.from('core_soil_boards').select('*').order('created_at', { ascending: true }),
                    adminSupabase.from('core_soil_sensors').select('*').order('pin_index', { ascending: true }),
                    adminSupabase.from('soil_telemetry').select('sensor_id, moisture_pct, created_at').order('created_at', { ascending: false }).limit(50)
                ]);

                if (sensorsData && sensorsData.length > 0) {
                    const boardMap = new Map<string, any>();
                    (boardsData || []).forEach((b: any) => boardMap.set(b.id, b));

                    const latestMoistureMap = new Map<string, number>();
                    (telemetryData || []).forEach((t: any) => {
                        if (!latestMoistureMap.has(t.sensor_id) && t.moisture_pct !== null && t.moisture_pct !== undefined) {
                            latestMoistureMap.set(t.sensor_id, Number(t.moisture_pct));
                        }
                    });

                    soilSensors = sensorsData.map((s: any) => {
                        const board = boardMap.get(s.board_id);
                        const boardName = board?.name || 'ESP32 Suelo';
                        const boardMac = board?.mac_address || '';
                        const shortMac = boardMac ? boardMac.slice(-5) : '';
                        const moisture = latestMoistureMap.get(s.id) ?? null;

                        return {
                            id: s.id,
                            board_id: s.board_id,
                            board_name: boardName,
                            board_mac: boardMac,
                            pin_index: s.pin_index,
                            name: s.name,
                            label: `${boardName}${shortMac && !boardName.includes(shortMac) ? ` (${shortMac})` : ''} • Pin ${s.pin_index} — ${s.name}`,
                            latest_moisture_pct: moisture
                        };
                    });
                }

                // 2. Consultar variedades de lotes
                const { data: batches } = await adminSupabase
                    .from('core_batches')
                    .select('id, strain, stage')
                    .order('timestamp', { ascending: false })
                    .limit(10);

                if (batches && batches.length > 0) {
                    const batchStrains = batches
                        .map((b: any) => b.strain)
                        .filter((s: any) => typeof s === 'string' && s.trim().length > 0);
                    availableStrains = Array.from(new Set([...batchStrains, ...availableStrains]));
                }

                // 3. Consultar último análisis por planta
                const { data: analyses } = await adminSupabase
                    .from('core_image_analyses')
                    .select('id, created_at, health_score, context_snapshot, image_urls')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (analyses && analyses.length > 0) {
                    const latest = analyses[0];
                    latestImageUrl = latest.image_urls?.[0] || null;
                    cropDetected = latest.context_snapshot?.crop_detected ?? (
                        (latest.health_score ?? 0) > 0 &&
                        (latest.context_snapshot?.canopy_coverage_pct ?? 0) > 0
                    );
                    if (cropDetected) {
                        latestPerPlant = reconcilePerPlantAnalysis(
                            grid,
                            latest.context_snapshot?.per_plant_analysis,
                            {
                                stage: latest.context_snapshot?.phenological_stage_detected || 'SEEDLING',
                                health_score: latest.health_score ?? 78,
                                crop_detected: cropDetected
                            }
                        );
                    }
                }
            } catch (e) {
                console.warn('[/api/vision/grid] Error consultando contexto adicional en Supabase:', e);
            }
        }

        return NextResponse.json({
            grid,
            soil_sensors: soilSensors,
            available_strains: availableStrains,
            latest_per_plant: latestPerPlant,
            latest_image_url: latestImageUrl,
            crop_detected: cropDetected
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (body.action === 'update_shelly_link') {
            const current = loadPlantGrid();
            const shellyId = String(body.linked_shelly_device_id || current.linked_shelly_device_id || 'shellyplus1-8813bf9f8878');
            const known = KNOWN_SHELLY_RELAYS.find(r => r.device_id === shellyId);
            const shellyName = body.linked_shelly_name || (known ? known.name : `Shelly (${shellyId})`);
            const onlyWhenOn = body.only_capture_when_shelly_on !== undefined
                ? Boolean(body.only_capture_when_shelly_on)
                : (current.only_capture_when_shelly_on !== false);
            const autoOnTurnOn = body.auto_capture_on_shelly_on !== undefined
                ? Boolean(body.auto_capture_on_shelly_on)
                : (current.auto_capture_on_shelly_on !== false);

            const updated = savePlantGrid({
                ...current,
                linked_shelly_device_id: shellyId,
                linked_shelly_name: shellyName,
                only_capture_when_shelly_on: onlyWhenOn,
                auto_capture_on_shelly_on: autoOnTurnOn
            });

            const shellyLink = await getShellyCameraLinkStatus(updated, adminSupabase);
            return NextResponse.json({ success: true, grid: updated, shelly_link: shellyLink });
        }

        if (body.action === 'template') {
            const tpl = body.template as 'staggered_5' | 'staggered_7' | 'staggered_10' | 'perimeter_8';
            const current = loadPlantGrid();
            const fresh = getTemplateGridLayout(tpl);

            const usedSensorIds = new Set<string>();
            const usedBioChannels = new Set<string>();

            const mergedZones = fresh.zones.map(newZone => {
                const existing = current.zones.find(z => z.zone_id === newZone.zone_id);
                if (existing) {
                    const sensorId = existing.soil_sensor_id || '';
                    const isDuplicateSensor = sensorId && usedSensorIds.has(sensorId);
                    const finalSensorId = isDuplicateSensor ? newZone.soil_sensor_id : existing.soil_sensor_id;
                    const finalSensorPin = isDuplicateSensor ? newZone.soil_sensor_pin : existing.soil_sensor_pin;
                    if (finalSensorId) usedSensorIds.add(finalSensorId);

                    const bioCh = existing.bio_channel || 'NONE';
                    const isDuplicateBio = bioCh !== 'NONE' && usedBioChannels.has(bioCh);
                    const finalBio = isDuplicateBio ? 'NONE' : bioCh;
                    if (finalBio !== 'NONE') usedBioChannels.add(finalBio);

                    return {
                        ...existing,
                        row: newZone.row,
                        col: newZone.col,
                        x_pct: newZone.x_pct,
                        y_pct: newZone.y_pct,
                        w_pct: newZone.w_pct,
                        h_pct: newZone.h_pct,
                        soil_sensor_id: finalSensorId,
                        soil_sensor_pin: finalSensorPin,
                        bio_channel: finalBio,
                        active: true
                    };
                }
                if (newZone.soil_sensor_id) usedSensorIds.add(newZone.soil_sensor_id);
                if (newZone.bio_channel !== 'NONE') usedBioChannels.add(newZone.bio_channel);
                return newZone;
            });

            const updated = savePlantGrid({
                ...current,
                layout_mode: fresh.layout_mode,
                grid_rows: fresh.grid_rows,
                grid_cols: fresh.grid_cols,
                zones: mergedZones
            });

            return NextResponse.json({ success: true, grid: updated });
        }

        if (body.action === 'resize') {
            const rows = Math.min(6, Math.max(1, Number(body.rows) || 2));
            const cols = Math.min(6, Math.max(1, Number(body.cols) || 3));
            const totalCells = rows * cols;
            const activeCount =
                typeof body.activeCount === 'number' && body.activeCount >= 1
                    ? Math.min(totalCells, Math.max(1, Number(body.activeCount)))
                    : undefined;

            const current = loadPlantGrid();
            const fresh = getDefaultGridLayout(rows, cols, activeCount);

            const usedSensorIds = new Set<string>();
            const usedBioChannels = new Set<string>();

            const mergedZones = fresh.zones.map((newZone, idx) => {
                const existing = current.zones.find(z => z.zone_id === newZone.zone_id);
                if (existing) {
                    const sensorId = existing.soil_sensor_id || '';
                    const isDuplicateSensor = sensorId && usedSensorIds.has(sensorId);
                    const finalSensorId = isDuplicateSensor ? newZone.soil_sensor_id : existing.soil_sensor_id;
                    const finalSensorPin = isDuplicateSensor ? newZone.soil_sensor_pin : existing.soil_sensor_pin;
                    if (finalSensorId) usedSensorIds.add(finalSensorId);

                    const bioCh = existing.bio_channel || 'NONE';
                    const isDuplicateBio = bioCh !== 'NONE' && usedBioChannels.has(bioCh);
                    const finalBio = isDuplicateBio ? 'NONE' : bioCh;
                    if (finalBio !== 'NONE') usedBioChannels.add(finalBio);

                    return {
                        ...existing,
                        row: newZone.row,
                        col: newZone.col,
                        x_pct: newZone.x_pct,
                        y_pct: newZone.y_pct,
                        w_pct: newZone.w_pct,
                        h_pct: newZone.h_pct,
                        soil_sensor_id: finalSensorId,
                        soil_sensor_pin: finalSensorPin,
                        bio_channel: finalBio,
                        active: activeCount !== undefined ? idx < activeCount : existing.active
                    };
                }
                if (newZone.soil_sensor_id) usedSensorIds.add(newZone.soil_sensor_id);
                if (newZone.bio_channel !== 'NONE') usedBioChannels.add(newZone.bio_channel);
                return newZone;
            });

            const updated = savePlantGrid({
                ...current,
                layout_mode: 'grid',
                grid_rows: rows,
                grid_cols: cols,
                zones: mergedZones
            });

            return NextResponse.json({ success: true, grid: updated });
        }

        if (body.action === 'reanalyze') {
            const analysis = await VisionAgentEngine.reanalyzeLatestCaptureWithCurrentGrid();
            const current = loadPlantGrid();
            return NextResponse.json({
                success: true,
                grid: current,
                latest_per_plant: analysis?.per_plant_analysis || reconcilePerPlantAnalysis(current, []),
                analysis
            });
        }

        if (body.grid) {
            const layout: PlantGridLayout = body.grid;
            const saved = savePlantGrid(layout);
            const normalized = loadPlantGrid();
            // Disparar re-análisis en segundo plano con las nuevas coordenadas y genéticas
            VisionAgentEngine.reanalyzeLatestCaptureWithCurrentGrid().catch(e =>
                console.warn('[Grid POST] Re-analysis background warning:', e)
            );
            return NextResponse.json({
                success: true,
                grid: normalized,
                reconciled_per_plant: reconcilePerPlantAnalysis(normalized, body.current_per_plant || [])
            });
        }

        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
