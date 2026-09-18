import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function GET() {
    try {
        if (!adminSupabase) {
            return NextResponse.json({ error: 'Supabase no inicializado' }, { status: 500 });
        }

        // Obtener el análisis más reciente
        const { data: analyses } = await adminSupabase
            .from('core_image_analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        const latestRaw = analyses && analyses.length > 0 ? analyses[0] : null;
        let latestAnalysis = null;
        if (latestRaw) {
            const isCrop = latestRaw.context_snapshot?.crop_detected ?? (
                (latestRaw.health_score ?? 0) > 0 &&
                (latestRaw.context_snapshot?.canopy_coverage_pct ?? 0) > 0
            );
            latestAnalysis = {
                ...latestRaw,
                crop_detected: isCrop,
                health_score: isCrop ? (latestRaw.health_score ?? 0) : 0,
                canopy_coverage_pct: isCrop ? (latestRaw.context_snapshot?.canopy_coverage_pct ?? 0) : 0,
                posture_state: isCrop ? (latestRaw.context_snapshot?.leaf_posture || 'TURGID') : 'NONE',
                light_stress_detected: isCrop ? (latestRaw.context_snapshot?.light_stress !== 'OPTIMAL' && latestRaw.context_snapshot?.light_stress !== undefined) : false,
                growth_stage_est: isCrop ? (latestRaw.context_snapshot?.batch?.stage || 'Floración') : 'Sin cultivo',
                image_url: latestRaw.image_urls?.[0] || null
            };
        }

        // Obtener histórico de las últimas 7 capturas para el gráfico de dosel y salud
        const { data: history } = await adminSupabase
            .from('core_image_analyses')
            .select('id, created_at, health_score, context_snapshot, image_urls')
            .order('created_at', { ascending: false })
            .limit(14);

        const timeline = (history || []).reverse().map(h => {
            const isCropH = h.context_snapshot?.crop_detected ?? (
                (h.health_score || 0) > 0 &&
                (h.context_snapshot?.canopy_coverage_pct || 0) > 0
            );
            return {
                id: h.id,
                timestamp: h.created_at,
                crop_detected: isCropH,
                health_score: isCropH ? (h.health_score || 0) : 0,
                canopy_coverage: isCropH ? (h.context_snapshot?.canopy_coverage_pct || 0) : 0,
                leaf_posture: isCropH ? (h.context_snapshot?.leaf_posture || 'TURGID') : 'NONE',
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
            latest_analysis: latestAnalysis,
            timeline
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
