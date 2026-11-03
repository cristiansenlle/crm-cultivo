import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadPlantGrid, savePlantGrid, getDefaultGridLayout, PlantGridLayout } from '@/lib/vision/PlantGridStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function GET() {
    try {
        const grid = loadPlantGrid();

        // Consultar variedades registradas en core_batches y último análisis por planta
        let availableStrains: string[] = ['Nicole Punch', 'Tropicanna WFC', 'Gorilla Glue #4', 'Amnesia Haze', 'OG Kush'];
        let latestPerPlant: any[] = [];
        let cropDetected = false;

        if (adminSupabase) {
            try {
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

                const { data: analyses } = await adminSupabase
                    .from('core_image_analyses')
                    .select('id, created_at, health_score, context_snapshot, image_urls')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (analyses && analyses.length > 0) {
                    const latest = analyses[0];
                    cropDetected = latest.context_snapshot?.crop_detected ?? (
                        (latest.health_score ?? 0) > 0 &&
                        (latest.context_snapshot?.canopy_coverage_pct ?? 0) > 0
                    );
                    if (Array.isArray(latest.context_snapshot?.per_plant_analysis)) {
                        latestPerPlant = latest.context_snapshot.per_plant_analysis;
                    }
                }
            } catch (e) {
                console.warn('[/api/vision/grid] Error consultando contexto adicional en Supabase:', e);
            }
        }

        return NextResponse.json({
            grid,
            available_strains: availableStrains,
            latest_per_plant: latestPerPlant,
            crop_detected: cropDetected
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Si solicita redimensionar la grilla (ej. 2x2, 2x3, 3x3)
        if (body.action === 'resize') {
            const rows = Math.min(4, Math.max(1, Number(body.rows) || 2));
            const cols = Math.min(4, Math.max(1, Number(body.cols) || 3));
            const current = loadPlantGrid();
            const fresh = getDefaultGridLayout(rows, cols);

            // Conservar configuraciones previas de zonas que coincidan en zone_id
            const mergedZones = fresh.zones.map(newZone => {
                const existing = current.zones.find(z => z.zone_id === newZone.zone_id);
                if (existing) {
                    return {
                        ...existing,
                        row: newZone.row,
                        col: newZone.col
                    };
                }
                return newZone;
            });

            const updated = savePlantGrid({
                ...current,
                grid_rows: rows,
                grid_cols: cols,
                zones: mergedZones
            });

            return NextResponse.json({ success: true, grid: updated });
        }

        // Guardado directo del layout completo
        if (body.grid) {
            const layout: PlantGridLayout = body.grid;
            const saved = savePlantGrid(layout);
            return NextResponse.json({ success: true, grid: saved });
        }

        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
