import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VisionAgentEngine } from '@/lib/vision/VisionAgentEngine';

// Directorio físico de almacenamiento (producción Contabo o local)
const CAPTURES_DIR = fs.existsSync('/var/www/captures/crop_vision')
    ? '/var/www/captures/crop_vision'
    : path.join(process.cwd(), 'public', 'captures');

export async function POST(req: NextRequest) {
    try {
        if (!fs.existsSync(CAPTURES_DIR)) {
            fs.mkdirSync(CAPTURES_DIR, { recursive: true });
        }

        const contentType = req.headers.get('content-type') || '';
        let fileBuffer: Buffer | null = null;
        let filename = '';
        let batchId: string | undefined;

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            batchId = (formData.get('batch_id') as string) || undefined;

            if (!file) {
                return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            fileBuffer = Buffer.from(bytes);
            const ext = path.extname(file.name) || '.jpg';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `cenital_${timestamp}${ext}`;
        } else {
            // Soporta JSON con base64
            const body = await req.json();
            const { image_base64, batch_id, name } = body;
            batchId = batch_id;

            if (!image_base64) {
                return NextResponse.json({ error: 'Falta image_base64 en el cuerpo JSON' }, { status: 400 });
            }

            const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
            fileBuffer = Buffer.from(cleanBase64, 'base64');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = name || `cenital_${timestamp}.jpg`;
        }

        const filePath = path.join(CAPTURES_DIR, filename);
        fs.writeFileSync(filePath, fileBuffer);
        console.log(`[Vision API] Foto guardada físicamente en: ${filePath}`);

        const publicUrl = `/captures/${filename}`;
        const base64Data = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

        // Disparar inferencia multimodal con VisionAgentEngine
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
