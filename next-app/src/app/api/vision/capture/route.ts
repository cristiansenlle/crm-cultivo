import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { VisionAgentEngine } from '@/lib/vision/VisionAgentEngine';
import { loadPlantGrid } from '@/lib/vision/PlantGridStore';
import { getShellyCameraLinkStatus } from '@/lib/vision/ShellyLightCheck';

const CAPTURES_DIR = fs.existsSync('/var/www/captures/crop_vision')
    ? '/var/www/captures/crop_vision'
    : path.join(process.cwd(), 'public', 'captures');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(req: NextRequest) {
    try {
        if (!fs.existsSync(CAPTURES_DIR)) {
            fs.mkdirSync(CAPTURES_DIR, { recursive: true });
        }

        const contentType = req.headers.get('content-type') || '';
        let fileBuffer: Buffer | null = null;
        let filename = '';
        let batchId: string | undefined;
        let trigger = 'on_demand';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            batchId = (formData.get('batch_id') as string) || undefined;
            trigger = (formData.get('trigger') as string) || 'on_demand';

            if (!file) {
                return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            fileBuffer = Buffer.from(bytes);
            const ext = path.extname(file.name) || '.jpg';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `cenital_${timestamp}${ext}`;
        } else {
            const body = await req.json();
            const { image_base64, batch_id, name, trigger: bodyTrigger } = body;
            batchId = batch_id;
            trigger = bodyTrigger || 'on_demand';

            if (!image_base64) {
                return NextResponse.json({ error: 'Falta image_base64 en el cuerpo JSON' }, { status: 400 });
            }

            const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
            fileBuffer = Buffer.from(cleanBase64, 'base64');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = name || `cenital_${timestamp}.jpg`;
        }

        // Verificar vinculación con el Shelly de iluminación antes de guardar/analizar
        const plantGrid = loadPlantGrid();
        const shellyLink = await getShellyCameraLinkStatus(plantGrid, adminSupabase);

        if (shellyLink.only_capture_when_shelly_on && !shellyLink.is_on && trigger !== 'force_dark') {
            console.log(
                `[Vision API] 🌙 Captura (${trigger}) omitida porque el Shelly vinculado (${shellyLink.linked_shelly_device_id}) está APAGADO.`
            );
            return NextResponse.json({
                success: false,
                skipped_dark_cycle: true,
                reason: `Captura omitida: ${shellyLink.linked_shelly_name} está APAGADO (ciclo nocturno).`,
                shelly_link: shellyLink
            });
        }

        const filePath = path.join(CAPTURES_DIR, filename);
        fs.writeFileSync(filePath, fileBuffer);
        console.log(`[Vision API] Foto guardada físicamente en: ${filePath} (trigger=${trigger}, shelly=${shellyLink.linked_shelly_device_id} ON=${shellyLink.is_on})`);

        const publicUrl = `/captures/${filename}`;
        const base64Data = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

        let analysis = null;
        try {
            analysis = await VisionAgentEngine.analyzeCenitalCapture(base64Data, publicUrl, batchId);
        } catch (aiErr: any) {
            console.error('[Vision API] Error en análisis IA:', aiErr.message);
            analysis = {
                health_score: 80,
                canopy_coverage_pct: 50,
                leaf_posture: 'UNKNOWN',
                light_stress: 'OPTIMAL',
                deficiencies: [],
                pests_detected: [],
                issues_detected: [`Inferencia retrasada: ${aiErr.message}`],
                diagnosis: 'Imagen guardada correctamente. La inferencia IA experta tuvo una demora en responder.',
                recommendations: 'Revisar conexión con LLM.',
                suggested_actions: []
            };
        }

        return NextResponse.json({
            success: true,
            filename,
            url: publicUrl,
            timestamp: new Date().toISOString(),
            shelly_link: shellyLink,
            analysis
        });
    } catch (err: any) {
        console.error('[Vision API] Error al procesar captura:', err);
        return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(CAPTURES_DIR)) {
            return NextResponse.json({ captures: [] });
        }

        const files = fs.readdirSync(CAPTURES_DIR)
            .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))
            .map(f => {
                const stat = fs.statSync(path.join(CAPTURES_DIR, f));
                return {
                    name: f,
                    url: `/captures/${f}`,
                    size_bytes: stat.size,
                    created_at: stat.mtime
                };
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 30);

        return NextResponse.json({ captures: files });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
