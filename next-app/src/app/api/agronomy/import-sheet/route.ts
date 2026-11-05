import { NextRequest, NextResponse } from 'next/server';
import { parseFertilizationPlanFromCsv } from '@/lib/agronomy/fertilizationPlanEngine';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sheetUrl, customName } = body;

        if (!sheetUrl || typeof sheetUrl !== 'string') {
            return NextResponse.json(
                { error: 'Debe proporcionar un link de Google Sheets válido.' },
                { status: 400 }
            );
        }

        // Extraer el ID del documento de Google Sheets y gid
        const idMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!idMatch || !idMatch[1]) {
            return NextResponse.json(
                { error: 'No se pudo extraer el ID del documento desde el link de Google Sheets.' },
                { status: 400 }
            );
        }

        const spreadsheetId = idMatch[1];
        const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
        const gid = gidMatch?.[1] || '0';

        const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
        const response = await fetch(csvExportUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (CRM Cannabis Agronomy Importer)'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: `No se pudo descargar la hoja (HTTP ${response.status}). Verifique que el Google Sheet tenga permisos de "Cualquier persona con el enlace puede ver".`
                },
                { status: 400 }
            );
        }

        const csvText = await response.text();
        if (!csvText || csvText.trim().length < 20) {
            return NextResponse.json(
                { error: 'El documento descargado está vacío o no contiene filas válidas.' },
                { status: 400 }
            );
        }

        const parsedPlan = parseFertilizationPlanFromCsv(csvText, customName, sheetUrl);
        return NextResponse.json({
            ok: true,
            plan: parsedPlan
        });
    } catch (err: any) {
        console.error('[import-sheet] Error importando Google Sheet:', err);
        return NextResponse.json(
            { error: err.message || 'Error procesando el Google Sheet' },
            { status: 500 }
        );
    }
}
