import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CAPTURES_DIR = fs.existsSync('/var/www/captures/crop_vision')
    ? '/var/www/captures/crop_vision'
    : path.join(process.cwd(), 'public', 'captures');

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await context.params;
        const sanitized = path.basename(filename);
        const filePath = path.join(CAPTURES_DIR, sanitized);

        if (!fs.existsSync(filePath)) {
            return new NextResponse('Imagen no encontrada', { status: 404 });
        }

        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(sanitized).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.webp') contentType = 'image/webp';

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, immutable'
            }
        });
    } catch (err: any) {
        return new NextResponse(err.message, { status: 500 });
    }
}
