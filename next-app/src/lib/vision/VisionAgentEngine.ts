import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export interface VisionAnalysisResult {
    crop_detected: boolean;
    health_score: number | null;
    canopy_coverage_pct: number;
    leaf_posture: 'PRAYING' | 'TURGID' | 'DROOPING' | 'CLAWING' | 'NONE' | 'UNKNOWN';
    light_stress: 'OPTIMAL' | 'LIGHT_BLEACHING' | 'HEAT_TACOING' | 'NONE' | 'UNKNOWN';
    deficiencies: string[];
    pests_detected: string[];
    issues_detected: string[];
    diagnosis: string;
    recommendations: string;
    suggested_actions?: Array<{
        type: string;
        event_type: string;
        description: string;
        water_liters?: number;
        ph_water?: number;
        ec_target?: number;
    }>;
}

export class VisionAgentEngine {
    /**
     * Analiza una imagen cenital del cultivo cruzando telemetría, biopotencial y clima.
     * @param imageBase64Data URL o base64 con data:image/...
     * @param imageUrl URL pública/estática de la imagen guardada
     * @param batchId ID del lote analizado (opcional, busca el activo si no se pasa)
     */
    static async analyzeCenitalCapture(
        imageBase64Data: string,
        imageUrl: string,
        batchId?: string
    ): Promise<VisionAnalysisResult> {
        if (!adminSupabase) {
            throw new Error('Cliente Supabase no configurado en el servidor');
        }

        // 1. Obtener lote activo si no se especificó
        let activeBatch: any = null;
        if (batchId) {
            const { data } = await adminSupabase.from('core_batches').select('*').eq('id', batchId).single();
            activeBatch = data;
        } else {
            const { data } = await adminSupabase.from('core_batches').select('*').order('timestamp', { ascending: false }).limit(1);
            if (data && data.length > 0) activeBatch = data[0];
        }

        let resolvedBatchId = activeBatch?.id;
        if (!resolvedBatchId) {
            const { data: anyBatch } = await adminSupabase.from('core_batches').select('id').limit(1);
            resolvedBatchId = anyBatch?.[0]?.id || 'NIcole Punch 2-2026';
        }
        const roomId = activeBatch?.room_id || activeBatch?.location || null;

        // 2. Recopilar contexto agronómico, climático y bioeléctrico
        let roomData: any = null;
        let recentClimate: any = null;
        let recentPhyto: any = null;
        let recentEvents: any = null;
        let recentSoil: any = null;

        if (roomId) {
            const { data: room } = await adminSupabase.from('core_rooms').select('id, name, phase').eq('id', roomId).single();
            roomData = room;

            // Clima interno reciente (VPD, Temperatura, Humedad)
            const { data: climate } = await adminSupabase.from('daily_telemetry')
                .select('created_at, temperature_c, humidity_percent, vpd_ambient_kpa, vpd_leaf_kpa')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(3);
            recentClimate = climate;
        }

        // Telemetría bioeléctrica ADS1115 y suelo centinela
        try {
            const { data: phyto } = await adminSupabase.from('device_logs')
                .select('created_at, payload')
                .eq('source', 'plant_electrophysiology')
                .order('created_at', { ascending: false })
                .limit(1);
            if (phyto && phyto.length > 0) recentPhyto = phyto[0].payload;
        } catch (e) {
            console.warn('No se pudo obtener registro bioeléctrico:', e);
        }

        try {
            const { data: soil } = await adminSupabase.from('core_soil_sensors')
                .select('soil_moisture_percent, ec_us_cm, soil_temp_c, last_read_at')
                .order('last_read_at', { ascending: false })
                .limit(1);
            if (soil && soil.length > 0) recentSoil = soil[0];
        } catch (e) {
            console.warn('No se pudo obtener registro de suelo:', e);
        }

        // Eventos agronómicos recientes
        try {
            const { data: events } = await adminSupabase.from('core_agronomic_events')
                .select('event_type, description, water_liters, date_occurred')
                .eq('batch_id', resolvedBatchId)
                .order('date_occurred', { ascending: false })
                .limit(4);
            recentEvents = events;
        } catch (e) {
            console.warn('No se pudieron obtener eventos recientes:', e);
        }

        // Días en la etapa
        let daysInStage = 0;
        if (activeBatch) {
            const startDate = activeBatch.last_stage_date || activeBatch.start_date || activeBatch.created_at;
            if (startDate) {
                daysInStage = Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
            }
        }

        const contextDossier = {
            timestamp: new Date().toISOString(),
            batch: {
                id: resolvedBatchId,
                strain: activeBatch?.strain || 'Variedad Genérica',
                stage: activeBatch?.stage || 'Vegetativo',
                days_in_stage: daysInStage,
                room: roomData?.name || 'Sala Principal',
                photoperiod: {
                    light_hours: activeBatch?.light_hours || 18,
                    dark_hours: activeBatch?.dark_hours || 6
                }
            },
            climate_telemetry: recentClimate || 'Sin datos recientes',
            soil_sensor: recentSoil || 'Sin sensor centinela',
            plant_electrophysiology: recentPhyto ? {
                biopotential_mv: recentPhyto.biopotential_mv,
                stress_index: recentPhyto.stress_index,
                pattern: recentPhyto.circadian_pattern
            } : 'Sin lectura bioeléctrica',
            recent_events: recentEvents || []
        };

        // 3. Elaborar el Prompt Experto en Visión Cenital
        const prompt = `Actúa como un Agrónomo Senior y Especialista en Visión Computacional para Cultivo Indoor de Cannabis de Alto Rendimiento.
Analiza la siguiente IMAGEN CENITAL (Top-Down, cámara de 120° en el techo mirando directamente hacia el dosel vegetal).

CONTEXTO REAL EN VIVO DEL CULTIVO:
${JSON.stringify(contextDossier, null, 2)}

INSTRUCCIONES DE ANÁLISIS CENITAL:
0. DETECCIÓN DE CULTIVO (crop_detected: boolean):
   - Determina si en la imagen efectivamente se observan plantas, hojas o dosel de cannabis.
   - Si la imagen muestra una habitación, sala de estar, personas, muebles, techo, paredes, o cualquier escena doméstica sin plantas de cultivo visibles:
     DEBES asignar obligatoriamente:
     "crop_detected": false,
     "health_score": 0,
     "canopy_coverage_pct": 0,
     "leaf_posture": "NONE",
     "light_stress": "NONE"
   - Si se observan plantas de cannabis reales, asigna "crop_detected": true y evalúa los puntos siguientes.

1. COBERTURA DE DOSEL (% Canopy Coverage): Estima el porcentaje (0 a 100) del área del cultivo cubierta por follaje verde vivo versus suelo/macetas/espacio vacío.
2. POSTURA FOLIAR (Leaf Posture):
   - "PRAYING": Hojas erguidas apuntando a 45° hacia la luz (máxima tasa de transpiración y asimilación).
   - "TURGID": Turgencia normal y equilibrada.
   - "DROOPING": Hojas decaídas o marchitas. Cruza con la humedad del suelo y VPD para saber si es falta de agua o sobre-riego.
   - "CLAWING": Puntas de las hojas curvadas en garra hacia abajo (posible toxicidad de Nitrógeno o corriente de viento excesiva).
   - "NONE": Cuando no hay plantas visibles.
3. ESTRÉS LUMÍNICO / TEMPERATURA:
   - "OPTIMAL": Color verde parejo en hojas superiores.
   - "LIGHT_BLEACHING": Puntas o ápices superiores decolorados/blanquecinos por estar demasiado cerca del panel LED.
   - "HEAT_TACOING": Bordes de las hojas curvados hacia arriba en forma de taco por calor o alto VPD.
   - "NONE": Cuando no hay plantas visibles.
4. DEFICIENCIAS Y FITOSANIDAD:
   - Revisa si hay clorosis intervenal (Mg/Fe), clorosis basal (N), puntas quemadas por sales (Nutrient burn).
   - Revisa presencia de oídio (manchas blancas pulverulentas), trips o arañita roja.
5. CORRELACIÓN MULTIMODAL OBLIGATORIA:
   - En tu "diagnosis", debes relacionar lo que ves en las hojas con los datos del sensor de suelo, el biopotencial bioeléctrico y los últimos riegos registrados.
6. SCORE DE SALUD: Valor numérico del 0 al 100 (0 si crop_detected es false).
7. ACCIONES SUGERIDAS: Tareas operativas concretas (Riego, Ajuste de EC, Poda, Subir/Bajar LED).

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA (sin bloques de código markdown ni texto adicional):
{
  "crop_detected": true,
  "health_score": 90,
  "canopy_coverage_pct": 75,
  "leaf_posture": "PRAYING",
  "light_stress": "OPTIMAL",
  "deficiencies": [],
  "pests_detected": [],
  "issues_detected": [],
  "diagnosis": "Diagnóstico conciso y justificado agronómicamente.",
  "recommendations": "Recomendaciones prácticas para el cultivador.",
  "suggested_actions": [
    {
      "type": "agronomic_event",
      "event_type": "Watering",
      "description": "Riego sugerido",
      "water_liters": 2.5,
      "ph_water": 6.2
    }
  ]
}`;

        let parsedResult: VisionAnalysisResult;

        // 4. Inferencia con LLM Multimodal (OpenRouter / Gemini)
        const openRouterKey = process.env.OPENROUTER_API_KEY || '';
        const geminiKey = process.env.GEMINI_API_KEY || '';

        let formattedImageData = imageBase64Data;
        if (!formattedImageData.startsWith('data:image/')) {
            formattedImageData = `data:image/jpeg;base64,${imageBase64Data}`;
        }

        if (openRouterKey) {
            try {
                let aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openRouterKey}`,
                        'HTTP-Referer': 'https://cannabiscrm.com',
                        'X-Title': 'CRM Cannabis Vision Agent',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.5-flash',
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: prompt },
                                    { type: 'image_url', image_url: { url: formattedImageData } }
                                ]
                            }
                        ],
                        response_format: { type: 'json_object' }
                    })
                });

                if (!aiResponse.ok) {
                    console.warn('[VisionAgentEngine] Intento con gemini-2.5-flash fallo, intentando con claude-sonnet-5...');
                    aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${openRouterKey}`,
                            'HTTP-Referer': 'https://cannabiscrm.com',
                            'X-Title': 'CRM Cannabis Vision Agent',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'anthropic/claude-sonnet-5',
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        { type: 'text', text: prompt },
                                        { type: 'image_url', image_url: { url: formattedImageData } }
                                    ]
                                }
                            ],
                            response_format: { type: 'json_object' }
                        })
                    });
                }

                if (!aiResponse.ok) {
                    const err = await aiResponse.text();
                    throw new Error(`OpenRouter Error: ${err}`);
                }

                const data = await aiResponse.json();
                let rawText = data.choices?.[0]?.message?.content || '{}';
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedResult = JSON.parse(rawText);
            } catch (openRouterErr) {
                console.warn('Fallback a Gemini directo por error en OpenRouter:', openRouterErr);
                parsedResult = await this.fallbackGemini(prompt, formattedImageData, geminiKey);
            }
        } else if (geminiKey) {
            parsedResult = await this.fallbackGemini(prompt, formattedImageData, geminiKey);
        } else {
            throw new Error('No hay API Keys de visión disponibles (OPENROUTER_API_KEY o GEMINI_API_KEY faltantes)');
        }

        // 5. Guardar en la base de datos `core_image_analyses`
        try {
            const isCrop = parsedResult.crop_detected ?? (
                parsedResult.health_score !== null && 
                (parsedResult.health_score ?? 0) > 0 && 
                (parsedResult.canopy_coverage_pct ?? 0) > 0
            );
            const finalHealthScore = isCrop ? (parsedResult.health_score ?? 80) : 0;
            const finalCanopy = isCrop ? (parsedResult.canopy_coverage_pct ?? 0) : 0;
            const finalPosture = isCrop ? (parsedResult.leaf_posture || 'TURGID') : 'NONE';
            const finalLightStress = isCrop ? (parsedResult.light_stress || 'OPTIMAL') : 'NONE';

            const { data: inserted, error: insertError } = await adminSupabase.from('core_image_analyses').insert({
                batch_id: resolvedBatchId,
                image_urls: [imageUrl],
                health_score: finalHealthScore,
                issues_detected: parsedResult.issues_detected || [],
                recommendations: (parsedResult.diagnosis || '') + '\n\n' + (parsedResult.recommendations || ''),
                suggested_actions: parsedResult.suggested_actions || [],
                context_snapshot: {
                    ...contextDossier,
                    crop_detected: isCrop,
                    canopy_coverage_pct: finalCanopy,
                    leaf_posture: finalPosture,
                    light_stress: finalLightStress,
                    deficiencies: parsedResult.deficiencies || [],
                    pests_detected: parsedResult.pests_detected || []
                }
            }).select();

            if (insertError) {
                console.error('[VisionAgentEngine] ❌ Error insertando en core_image_analyses:', insertError);
            } else {
                console.log('[VisionAgentEngine] ✅ Análisis persistido exitosamente en core_image_analyses:', inserted?.[0]?.id);
            }
        } catch (dbErr) {
            console.error('[VisionAgentEngine] Error al guardar en core_image_analyses:', dbErr);
        }

        return parsedResult;
    }

    private static async fallbackGemini(prompt: string, base64Url: string, apiKey: string): Promise<VisionAnalysisResult> {
        if (!apiKey) throw new Error('GEMINI_API_KEY no disponible para fallback');
        
        // Extraer base64 crudo y mimeType
        const parts = base64Url.split(';base64,');
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        const base64Content = parts[1] || '';

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Content
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    response_mime_type: 'application/json'
                }
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return JSON.parse(text);
    }
}
