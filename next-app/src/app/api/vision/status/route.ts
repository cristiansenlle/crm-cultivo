import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadPlantGrid } from '@/lib/vision/PlantGridStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function GET() {
    try {
        if (!adminSupabase) {
            return NextResponse.json({ error: 'Supabase no inicializado' }, { status: 500 });
        }

        const plantGrid = loadPlantGrid();

        // Obtener el análisis más reciente
        const { data: analyses } = await adminSupabase
            .from('core_image_analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        const latestRaw = analyses && analyses.length > 0 ? analyses[0] : null;
        let latestAnalysis = null;

        if (latestRaw) {
            const snap = latestRaw.context_snapshot || {};
            const isCrop = snap.crop_detected ?? (
                (latestRaw.health_score ?? 0) > 0 &&
                (snap.canopy_coverage_pct ?? 0) > 0
            );

            latestAnalysis = {
                ...latestRaw,
                crop_detected: isCrop,
                phenological_stage_detected: isCrop ? (snap.phenological_stage_detected || 'FLOWERING_MID') : 'NONE',
                health_score: isCrop ? (latestRaw.health_score ?? 0) : 0,
                canopy_coverage_pct: isCrop ? (snap.canopy_coverage_pct ?? 0) : 0,
                daily_growth_delta_pct: isCrop ? (snap.daily_growth_delta_pct ?? 0) : 0,
                posture_state: isCrop ? (snap.leaf_posture || 'TURGID') : 'NONE',
                circadian_turgor_state: isCrop ? (snap.circadian_turgor_state || 'NORMAL_ASSIMILATION') : 'NONE',
                light_stress_detected: isCrop ? (snap.light_stress !== 'OPTIMAL' && snap.light_stress !== 'NONE' && snap.light_stress !== undefined) : false,
                photoperiod_audit: snap.photoperiod_audit || 'LIGHTS_ON_OK',
                bud_sites_count: isCrop ? (snap.bud_sites_count ?? 0) : 0,
                estimated_yield_grams: isCrop ? (snap.estimated_yield_grams ?? 0) : 0,
                harvest_readiness_pct: isCrop ? (snap.harvest_readiness_pct ?? 0) : 0,
                lifecycle_advisors: snap.lifecycle_advisors || null,
                per_plant_analysis: isCrop && Array.isArray(snap.per_plant_analysis) ? snap.per_plant_analysis : [],
                growth_stage_est: isCrop ? (snap.batch?.stage || 'Floración') : 'Sin cultivo',
                image_url: latestRaw.image_urls?.[0] || null
            };
        }

        // Obtener histórico de las últimas 18 capturas para curvas circadianas, crecimiento y diagnósticos
        const { data: history } = await adminSupabase
            .from('core_image_analyses')
            .select('id, created_at, health_score, context_snapshot, image_urls, recommendations')
            .order('created_at', { ascending: false })
            .limit(18);

        const timeline = (history || []).reverse().map(h => {
            const snapH = h.context_snapshot || {};
            const isCropH = snapH.crop_detected ?? (
                (h.health_score || 0) > 0 &&
                (snapH.canopy_coverage_pct || 0) > 0
            );
            return {
                id: h.id,
                timestamp: h.created_at,
                crop_detected: isCropH,
                phenological_stage: isCropH ? (snapH.phenological_stage_detected || 'FLOWERING_MID') : 'NONE',
                health_score: isCropH ? (h.health_score || 0) : 0,
                canopy_coverage: isCropH ? (snapH.canopy_coverage_pct || 0) : 0,
                daily_growth_delta: isCropH ? (snapH.daily_growth_delta_pct || 0) : 0,
                bud_sites_count: isCropH ? (snapH.bud_sites_count || 0) : 0,
                estimated_yield_grams: isCropH ? (snapH.estimated_yield_grams || 0) : 0,
                harvest_readiness_pct: isCropH ? (snapH.harvest_readiness_pct || 0) : 0,
                leaf_posture: isCropH ? (snapH.leaf_posture || 'TURGID') : 'NONE',
                circadian_state: isCropH ? (snapH.circadian_turgor_state || 'NORMAL_ASSIMILATION') : 'NONE',
                per_plant_analysis: isCropH && Array.isArray(snapH.per_plant_analysis) ? snapH.per_plant_analysis : [],
                recommendations: h.recommendations || '',
                image_url: h.image_urls?.[0] || null
            };
        });

        return NextResponse.json({
            camera: {
                model: 'Sony IMX708 (Camera Module 3 Wide 120°)',
                orientation: 'Cenital (Top-Down)',
                resolution: '12 MP con Autofoco y HDR activo',
                interval: '1 hora (fotoperíodo activo)'
            },
            plant_grid: plantGrid,
            latest_analysis: latestAnalysis,
            timeline
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
