import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Instanciar cliente de Supabase (Admin) para lectura de datos
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { images, batchId, lat, lon } = body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json({ error: 'Faltan imágenes' }, { status: 400 });
        }
        if (!batchId) {
            return NextResponse.json({ error: 'Falta batchId' }, { status: 400 });
        }

        // 1. Recopilar datos externos (Clima Open-Meteo)
        let externalWeather = null;
        // Fallback a Wilde, Buenos Aires si no hay geolocalización
        const fetchLat = lat || -34.6973;
        const fetchLon = lon || -58.3114;
        
        try {
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${fetchLat}&longitude=${fetchLon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto`;
            const weatherRes = await fetch(weatherUrl);
            if (weatherRes.ok) {
                const wData = await weatherRes.json();
                externalWeather = {
                    current: {
                        temp: wData.current?.temperature_2m,
                        humidity: wData.current?.relative_humidity_2m,
                        wind_speed: wData.current?.wind_speed_10m
                    },
                    forecast_next_3_days: {
                        dates: wData.daily?.time,
                        temp_max: wData.daily?.temperature_2m_max,
                        temp_min: wData.daily?.temperature_2m_min,
                        precip_prob: wData.daily?.precipitation_probability_max
                    }
                };
            }
        } catch (e) {
            console.warn("No se pudo obtener clima exterior:", e);
        }

        // 2. Recopilar datos de Supabase
        let batchInfo = null;
        let recentEvents = null;
        let recentClimate = null;

        if (adminSupabase) {
            // Lote
            const { data: batch, error: batchErr } = await adminSupabase.from('core_batches').select('*').eq('id', batchId).single();
            batchInfo = batch;
            if (batchErr) console.error("Batch Fetch Error:", batchErr);

            // Sala (buscada por separado para evitar fallos de JOIN)
            let roomInfo = null;
            if (batch?.location) {
                const { data: room } = await adminSupabase.from('core_rooms').select('name, phase').eq('id', batch.location).single();
                roomInfo = room;
                
                // Clima interno reciente
                const { data: climate, error: climErr } = await adminSupabase.from('daily_telemetry')
                    .select('created_at, temperature_c, humidity_percent, vpd_ambient_kpa, vpd_leaf_kpa')
                    .eq('room_id', batch.location)
                    .order('created_at', { ascending: false })
                    .limit(5);
                recentClimate = climate;
                if (climErr) console.error("Climate Fetch Error:", climErr);
            }

            // Eventos agronómicos recientes
            const { data: events, error: evErr } = await adminSupabase.from('core_agronomic_events')
                .select('event_type, description, water_liters, date_occurred, status')
                .eq('batch_id', batchId)
                .order('date_occurred', { ascending: false })
                .limit(5);
            recentEvents = events;
            if (evErr) console.error("Events Fetch Error:", evErr);
            
            // Adjuntar info de la sala al batchInfo de forma manual
            if (batchInfo && roomInfo) {
                batchInfo.room_name = roomInfo.name;
                batchInfo.room_phase = roomInfo.phase;
            }
        }

        // 3. Preparar contexto para la IA
        let daysInPhase: string | number = 'Desconocido';
        if (batchInfo) {
            const lastDateStr = batchInfo.last_stage_date || batchInfo.start_date || batchInfo.created_at;
            if (lastDateStr) {
                daysInPhase = Math.max(0, Math.floor((Date.now() - new Date(lastDateStr).getTime()) / (1000 * 60 * 60 * 24)));
            }
        }

        const contextDossier = {
            current_date: new Date().toISOString().split('T')[0], // CRITICAL: So AI knows what "today" is
            batch: batchInfo ? { 
                name: batchInfo.id,
                strain: batchInfo.strain, 
                stage: batchInfo.stage || 'Desconocido',
                days_in_current_stage: daysInPhase,
                stage_history: batchInfo.stage_history || [],
                planted: batchInfo.start_date,
                room: batchInfo.room_name,
                room_phase: batchInfo.room_phase,
                photoperiod: {
                    light_hours: batchInfo.light_hours,
                    dark_hours: batchInfo.dark_hours
                }
            } : 'No disponible',
            recent_internal_climate: recentClimate || 'No disponible',
            recent_agronomic_events: recentEvents || 'No disponible',
            external_weather: externalWeather || 'No disponible (sin geolocalización)'
        };
        
        console.log("--- CONTEXT DOSSIER ---", JSON.stringify(contextDossier, null, 2));

        const prompt = `Eres un ingeniero agrónomo senior especialista en el cultivo de cannabis indoor de alto rendimiento.
        Analiza las imágenes adjuntas cruzando OBLIGATORIAMENTE la información visual con el siguiente contexto de datos de la base de datos (telemetría, clima externo, fotoperiodo y bitácora).
        
        BASE DE CONOCIMIENTOS - TIEMPOS DEL CANNABIS:
        - Vegetativo: Fotoperiodo 18/6. Crecimiento estructural.
        - Floración Semanas 1-3 (Días 1-21): Estiramiento (stretch) y formación inicial de botones florales (pelos blancos). No hay resina.
        - Floración Semanas 4-5 (Días 22-35): Engorde de cálices. Los pistilos siguen mayormente blancos. Comienza la producción visible de resina (tricomas transparentes), PERO NO HAY MADURACIÓN DE TRICOMAS AÚN.
        - Floración Semanas 6-7 (Días 36-49): Los cálices se hinchan. Los pistilos comienzan a oxidarse (marrón/naranja). Los tricomas pasan de transparentes a lechosos.
        - Floración Semanas 8-10+ (Días 50-70+): Maduración final. Tricomas lechosos y ámbar.
        ¡NUNCA asumas que a los 28 días de floración debe haber maduración de tricomas! Utiliza esta guía para juzgar la coherencia temporal.
        
        CONTEXTO DEL LOTE Y SALA:
        ${JSON.stringify(contextDossier, null, 2)}
        
        INSTRUCCIONES CRÍTICAS:
        1. TOMA NOTA DE LA FECHA ACTUAL ("current_date") en el contexto para evaluar hace cuántos días ocurrieron los "recent_agronomic_events". 
        2. TOMA NOTA DE LOS DÍAS EN LA FASE ACTUAL ("days_in_current_stage"). Usa la Base de Conocimientos de arriba para saber exactamente qué esperar ver en la planta según esos días, y no te adelantes en el tiempo.
        3. FOTOPERIODO ("photoperiod"): Verifica si tiene sentido agronómico para la fase.
        4. CLIMA EXTERNO ACTUAL Y FUTURO ("external_weather"): Incluye en el diagnóstico ("diagnosis") un análisis obligatorio sobre cómo el clima exterior *actual* y *pronosticado* para los próximos 3 días (temperatura y lluvia) puede impactar el cultivo indoor (ej. altas humedades pronosticadas obligan a vigilar el VPD y encender deshumidificadores).
        5. CRUCE DE DATOS INTEGRAL: Correlaciona lo que ves en las fotos con "recent_agronomic_events" (riegos, nutrición), "recent_internal_climate" (VPD, Temp, Hum) y "external_weather".
        6. Provee un score de salud del 0 al 100.
        7. Sugiere acciones correctivas o preventivas a corto plazo.
        
        Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
        {
            "health_score": numero (0 a 100),
            "issues_detected": ["problema 1 cruzando info", "problema 2 visual"],
            "diagnosis": "Un párrafo detallado explicando el diagnóstico experto y justificándolo con los datos temporales del historial (riegos, nutrición), los días en la etapa actual y el clima.",
            "recommendations": "Texto descriptivo con recomendaciones",
            "suggested_actions": [
                {
                    "type": "agronomic_event",
                    "event_type": "Watering" | "Nutrients" | "Pruning" | "Pest Control" | "Observation",
                    "description": "Descripción corta de la acción a registrar",
                    "water_liters": numero opcional,
                    "ph_water": numero opcional
                }
            ]
        }
        No devuelvas texto fuera del JSON (sin bloques \`\`\`json ni formatos markdown).
        `;

        // Formato para OpenRouter
        const openRouterMessages: any[] = [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt }
                ]
            }
        ];

        let imageCount = 0;
        for (const imgUrl of images) {
            if (typeof imgUrl === 'string' && imgUrl.startsWith('data:image/')) {
                openRouterMessages[0].content.push({
                    type: "image_url",
                    image_url: {
                        url: imgUrl
                    }
                });
                imageCount++;
            }
        }

        if (imageCount === 0) {
             return NextResponse.json({ error: 'No se pudieron procesar las imágenes.' }, { status: 400 });
        }

        const openRouterKey = process.env.OPENROUTER_API_KEY || '';
        if (!openRouterKey) {
            throw new Error("API Key de OpenRouter no configurada en las variables de entorno.");
        }

        // Llamada a OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "HTTP-Referer": "https://cannabiscrm.com",
                "X-Title": "CRM Cannabis AI",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "anthropic/claude-sonnet-5", // Modelo experto elegido
                messages: openRouterMessages,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
             const errText = await response.text();
             throw new Error(`OpenRouter Error: ${errText}`);
        }

        const data = await response.json();
        let aiResult = data.choices?.[0]?.message?.content;
        
        if (!aiResult) {
            throw new Error("No response from AI");
        }

        // Limpiar posible Markdown
        if (aiResult.startsWith('\`\`\`json')) {
            aiResult = aiResult.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
        } else if (aiResult.startsWith('\`\`\`')) {
            aiResult = aiResult.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
        }

        // Parseamos la respuesta para validarla
        const parsedResult = JSON.parse(aiResult);

        return NextResponse.json(parsedResult);
    } catch (error: any) {
        console.error('Error en analyze-crop API:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
