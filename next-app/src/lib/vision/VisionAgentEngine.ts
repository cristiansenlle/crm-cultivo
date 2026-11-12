import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { loadPlantGrid, reconcilePerPlantAnalysis, PerPlantAnalysis } from './PlantGridStore';
import {
    RED_HOT_COOKIES_FEEDING_PLAN,
    resolveBatchActivePlanWeek,
    evaluateVisionPlanCorrelation,
    VisionPlanCorrelation
} from '../agronomy/fertilizationPlanEngine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const adminSupabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export interface LifecycleAdvisors {
    topping_lst_advice: string;
    scrog_tucking_advice: string;
    optimal_flip_advice: string;
    defoliation_advice: string;
    staggered_harvest_advice: string;
}

export interface VisionAnalysisResult {
    crop_detected: boolean;
    phenological_stage_detected:
        | 'SEEDLING'
        | 'VEGETATIVE_EARLY'
        | 'VEGETATIVE_SCROG'
        | 'PRE_FLOWER_STRETCH'
        | 'FLOWERING_MID'
        | 'RIPENING_SENESCENCE'
        | 'HARVEST_READY'
        | 'NONE';
    health_score: number | null;
    canopy_coverage_pct: number;
    daily_growth_delta_pct: number;
    leaf_posture: 'PRAYING' | 'TURGID' | 'DROOPING' | 'CLAWING' | 'NONE' | 'UNKNOWN';
    circadian_turgor_state:
        | 'PEAK_PRAYING'
        | 'NORMAL_ASSIMILATION'
        | 'CIRCADIAN_ANTICIPATION_REST'
        | 'STRESS_DROOP'
        | 'NONE';
    light_stress: 'OPTIMAL' | 'LIGHT_BLEACHING' | 'HEAT_TACOING' | 'NONE' | 'UNKNOWN';
    photoperiod_audit: 'LIGHTS_ON_OK' | 'LIGHTS_OFF_OK' | 'LIGHT_LEAK_ALERT';
    bud_sites_count: number;
    estimated_yield_grams: number;
    harvest_readiness_pct: number;
    lifecycle_advisors: LifecycleAdvisors;
    per_plant_analysis: PerPlantAnalysis[];
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
    fertilization_plan_correlation?: VisionPlanCorrelation;
}

export class VisionAgentEngine {
    /**
     * Analiza una imagen cenital del cultivo cruzando el Mapa Espacial de Cuadrícula (Plant Grid),
     * múltiples genéticas, telemetría ambiental, humedad de suelo y biopotencial vegetal.
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

        // 2. Cargar el Mapa Espacial de Cuadrícula de Plantas y Multigenética
        const plantGrid = loadPlantGrid();
        const activeZones = plantGrid.zones.filter(z => z.active);

        // 3. Consultar captura previa válida para calcular Delta de Crecimiento Diario (Δ%/día)
        let prevCanopyCoverage: number | null = null;
        try {
            const { data: prevAnalyses } = await adminSupabase
                .from('core_image_analyses')
                .select('created_at, context_snapshot, health_score')
                .order('created_at', { ascending: false })
                .limit(10);

            if (prevAnalyses && prevAnalyses.length > 0) {
                const validPrev = prevAnalyses.find(
                    a => a.context_snapshot?.crop_detected === true && (a.context_snapshot?.canopy_coverage_pct ?? 0) > 0
                );
                if (validPrev) {
                    prevCanopyCoverage = Number(validPrev.context_snapshot.canopy_coverage_pct);
                }
            }
        } catch (e) {
            console.warn('[VisionAgentEngine] No se pudo consultar análisis previo para delta de crecimiento:', e);
        }

        // 4. Recopilar contexto agronómico, climático y bioeléctrico
        let roomData: any = null;
        let recentClimate: any = null;
        let recentPhyto: any = null;
        let recentEvents: any = null;
        let recentSoil: any = null;

        if (roomId) {
            const { data: room } = await adminSupabase.from('core_rooms').select('id, name, phase').eq('id', roomId).single();
            roomData = room;

            const { data: climate } = await adminSupabase.from('daily_telemetry')
                .select('created_at, temperature_c, humidity_percent, vpd_ambient_kpa, vpd_leaf_kpa')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(3);
            recentClimate = climate;
        }

        try {
            const { data: phyto } = await adminSupabase.from('device_logs')
                .select('created_at, payload, event')
                .eq('source', 'plant_electrophysiology')
                .order('created_at', { ascending: false })
                .limit(1);
            if (phyto && phyto.length > 0) recentPhyto = phyto[0].payload || phyto[0].event;
        } catch (e) {
            console.warn('No se pudo obtener registro bioeléctrico:', e);
        }

        try {
            const [{ data: soilSensors }, { data: soilTele }] = await Promise.all([
                adminSupabase.from('core_soil_sensors').select('id, board_id, pin_index, name').order('pin_index', { ascending: true }),
                adminSupabase.from('soil_telemetry').select('sensor_id, moisture_pct, created_at').order('created_at', { ascending: false }).limit(30)
            ]);
            if (soilSensors && soilSensors.length > 0) {
                recentSoil = soilSensors.map((s: any) => {
                    const latestRead = (soilTele || []).find((t: any) => t.sensor_id === s.id);
                    return {
                        sensor_id: s.id,
                        pin_index: s.pin_index,
                        name: s.name,
                        moisture_pct: latestRead?.moisture_pct ?? null,
                        last_read_at: latestRead?.created_at ?? null
                    };
                });
            }
        } catch (e) {
            console.warn('No se pudo obtener registro de suelo:', e);
        }

        try {
            const { data: events } = await adminSupabase.from('core_agronomic_events')
                .select('event_type, description, water_liters, water_volume_liters, solution_ph, solution_ec, solution_ppm, date_occurred')
                .eq('batch_id', resolvedBatchId)
                .order('date_occurred', { ascending: false })
                .limit(4);
            recentEvents = events;
        } catch (e) {
            console.warn('No se pudieron obtener eventos recientes:', e);
        }

        let daysInStage = 0;
        if (activeBatch) {
            const startDate = activeBatch.last_stage_date || activeBatch.start_date || activeBatch.created_at;
            if (startDate) {
                daysInStage = Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
            }
        }

        const resolvedFertPlan = activeBatch
            ? resolveBatchActivePlanWeek(activeBatch, RED_HOT_COOKIES_FEEDING_PLAN, recentEvents || [])
            : null;

        const fertilizationPlanContext = resolvedFertPlan ? {
            plan_name: resolvedFertPlan.plan.name,
            photoperiod_metrics: {
                light_hours: resolvedFertPlan.lightHours,
                dark_hours: resolvedFertPlan.darkHours,
                cycle_total_hours: resolvedFertPlan.cycleTotalHours,
                is_extended_photoperiod_over_24h: resolvedFertPlan.isExtendedPhotoperiod,
                stretch_factor: Number(resolvedFertPlan.photoperiodStretchFactor.toFixed(2)),
                calendar_days_in_stage: resolvedFertPlan.calendarDaysInStage,
                biological_cycles_completed: resolvedFertPlan.biologicalCyclesCompleted,
                calendar_week_in_stage: resolvedFertPlan.calendarWeekInStage,
                biological_week_in_stage: resolvedFertPlan.biologicalWeekInStage,
                active_week_number: resolvedFertPlan.effectiveWeekNumber
            },
            active_week_target: resolvedFertPlan.activeWeek ? {
                stage: resolvedFertPlan.activeWeek.stage,
                week_number: resolvedFertPlan.activeWeek.week_number,
                phenology_name: resolvedFertPlan.activeWeek.phenology,
                target_ph_range: `${resolvedFertPlan.activeWeek.target_ph_min}-${resolvedFertPlan.activeWeek.target_ph_max}`,
                target_ec_range_mS_cm: `${resolvedFertPlan.activeWeek.target_ec_min}-${resolvedFertPlan.activeWeek.target_ec_max}`,
                target_ppm_500_range: `${resolvedFertPlan.activeWeek.target_ppm_min}-${resolvedFertPlan.activeWeek.target_ppm_max}`,
                water_per_plant_liters: `${resolvedFertPlan.plan.water_per_plant_liters} L`,
                main_mineral_irrigation: resolvedFertPlan.activeWeek.primary_nutrients,
                secondary_irrigation: resolvedFertPlan.activeWeek.secondary_nutrients,
                agronomic_notes: resolvedFertPlan.activeWeek.notes
            } : null
        } : null;

        const contextDossier = {
            timestamp: new Date().toISOString(),
            batch: activeBatch ? {
                id: activeBatch.id,
                strain: activeBatch.strain,
                stage: activeBatch.stage || roomData?.phase || 'Floración',
                days_in_stage: daysInStage,
                photoperiod: {
                    light_hours: activeBatch.light_hours || 12,
                    dark_hours: activeBatch.dark_hours || 12
                },
                room: roomData?.name || activeBatch.location || 'Sala Principal'
            } : 'Sin lote activo vinculado',
            fertilization_plan_context: fertilizationPlanContext,
            spatial_plant_grid: {
                dimensions: `${plantGrid.grid_rows} filas x ${plantGrid.grid_cols} columnas`,
                scrog_net_installed: plantGrid.scrog_net_installed,
                target_flip_coverage_pct: plantGrid.target_flip_coverage_pct,
                previous_canopy_coverage_pct: prevCanopyCoverage,
                layout_mode: plantGrid.layout_mode || 'grid',
                mapped_plants: activeZones.map(z => ({
                    zone_id: z.zone_id,
                    bounding_box_pct: `X: ${Math.round(z.x_pct ?? 0)}% a ${Math.round((z.x_pct ?? 0) + (z.w_pct ?? 33))}%, Y: ${Math.round(z.y_pct ?? 0)}% a ${Math.round((z.y_pct ?? 0) + (z.h_pct ?? 50))}% del encuadre`,
                    position: `Región (${Math.round(z.x_pct ?? 0)}%-${Math.round((z.x_pct ?? 0) + (z.w_pct ?? 33))}% horiz, ${Math.round(z.y_pct ?? 0)}%-${Math.round((z.y_pct ?? 0) + (z.h_pct ?? 50))}% vert)`,
                    plant_name: z.plant_name,
                    strain: z.strain,
                    biotype: z.biotype,
                    natural_anthocyanins_purple: z.natural_anthocyanins,
                    expected_flowering_days: z.expected_flowering_days,
                    soil_sensor: z.soil_sensor_pin,
                    bio_channel: z.bio_channel
                }))
            },
            climate_telemetry: recentClimate || 'Sin lecturas recientes',
            soil_sensor: recentSoil || 'Sin sensor centinela',
            plant_electrophysiology: recentPhyto || 'Sin lectura bioeléctrica',
            recent_events: recentEvents || []
        };

        // 5. Elaborar el Prompt Experto en Visión Cenital v2.0 (Ciclo Completo + Plantas Individuales + Multigenética)
        const prompt = `Actúa como un Agrónomo Senior y Especialista en Visión Computacional para Cultivo Indoor de Cannabis de Alto Rendimiento.
Analiza la siguiente IMAGEN CENITAL (Top-Down, cámara fija de 120° en el techo mirando hacia la carpa de cultivo).

CONTEXTO REAL EN VIVO Y MAPA ESPACIAL DE PLANTAS:
${JSON.stringify(contextDossier, null, 2)}

INSTRUCCIONES ESTRICTAS DE ANÁLISIS CENITAL v2.0 (CICLO COMPLETO E INDIVIDUALIZACIÓN):

0. DETECCIÓN DE CULTIVO (crop_detected: boolean):
   - Determina si en la imagen se observan plantas reales de cannabis o un entorno de cultivo vegetal.
   - Si la imagen muestra una habitación doméstica, muebles, televisor, techo, paredes o personas sin plantas visibles:
     DEBES asignar obligatoriamente:
     "crop_detected": false,
     "phenological_stage_detected": "NONE",
     "health_score": 0,
     "canopy_coverage_pct": 0,
     "daily_growth_delta_pct": 0,
     "leaf_posture": "NONE",
     "circadian_turgor_state": "NONE",
     "light_stress": "NONE",
     "photoperiod_audit": "LIGHTS_ON_OK",
     "bud_sites_count": 0,
     "estimated_yield_grams": 0,
     "harvest_readiness_pct": 0,
     "per_plant_analysis": []
   - Si hay cultivo visible, asigna "crop_detected": true y ejecuta el análisis completo de los puntos 1 al 8:

1. ETAPA FENOLÓGICA Y COBERTURA DE DOSEL:
   - Clasifica "phenological_stage_detected" en: "SEEDLING", "VEGETATIVE_EARLY", "VEGETATIVE_SCROG", "PRE_FLOWER_STRETCH", "FLOWERING_MID", "RIPENING_SENESCENCE", o "HARVEST_READY".
   - Calcula "canopy_coverage_pct" (0 a 100%) de área verde sobre el total de la malla/carpa.
   - Calcula "daily_growth_delta_pct": tasa de expansión diaria estimada según el vigor o comparando con previous_canopy_coverage_pct.

2. MAPEO INDIVIDUAL DE PLANTAS POR COORDENADAS ESPACIALES (per_plant_analysis):
   - Cada planta en mapped_plants tiene su recuadro exacto en porcentaje sobre el fotograma ("bounding_box_pct", donde X: 0%-100% va de izquierda a derecha e Y: 0%-100% va de arriba a abajo, soportando grillas, tresbolillo/zig-zag o zonas libres).
   - OBLIGATORIO: "per_plant_analysis" DEBE contener exactamente ${activeZones.length} elementos, uno por cada planta en mapped_plants (${activeZones.map(z => z.zone_id).join(', ')}), respetando exactamente su "zone_id", "plant_name" y "strain". No omitas ninguna zona mapeada.
   - Si la etapa es "SEEDLING", "VEGETATIVE_EARLY" o "VEGETATIVE_SCROG", asigna obligatoriamente "bud_count": 0, "maturity_pct": 0, "estimated_yield_grams": 0, "harvest_readiness_pct": 0 y "harvest_status": "VEGETATIVE".
   - Para CADA planta listada en mapped_plants, inspecciona exclusivamente su región "bounding_box_pct":
     * Estado de salud individual (0-100), % de su cuadrante cubierto (canopy_share_pct), postura foliar ("PRAYING", "TURGID", "DROOPING", "CLAWING").
     * DIFERENCIACIÓN MULTIGENÉTICA: Observa el ancho de foliolos (Indica ancha vs Sativa fina), estiramiento (stretch) y pigmentación.
     * REGLA DE ANTOCIANINAS: Si "natural_anthocyanins_purple" es true para esa planta (ej. Nicole Punch o Tropicanna), los tonos morados/púrpura en hojas superiores durante floración avanzada deben clasificarse como "anthocyanin_expression": "GENETIC_NORMAL" (salud alta) y NO como deficiencia de fósforo. Si es false y hay morado severo, clasifícalo como "STRESS_INDUCED".
     * Cuenta las colas florales principales en ese cuadrante ("bud_count") y estima su % de madurez hacia cosecha ("maturity_pct" y "harvest_status": "VEGETATIVE", "DEVELOPING", "FLUSH_WINDOW", "READY_TO_CHOP", "OVERRIPE_RISK").

3. ASISTENTES DE CICLO COMPLETO (lifecycle_advisors):
   - "topping_lst_advice": Recomendación de poda apical o amarre LST según simetría de cada planta.
   - "scrog_tucking_advice": Indica qué cuadrantes tienen huecos vacíos en la red SCROG y hacia dónde doblar (tuck) las ramas más altas.
   - "optimal_flip_advice": Indica si ya se alcanzó el % óptimo de malla (${plantGrid.target_flip_coverage_pct}%) para pasar a 12/12 o cuántos días faltan según el biotipo.
   - "defoliation_advice": Mapa de deshoje selectivo indicando en qué cuadrantes hay hojas abanico grandes tapando flores inferiores o bloqueando el flujo de aire.
   - "staggered_harvest_advice": Plan de cosecha escalonada comparando las genéticas presentes (cuál cortar primero y a cuál darle más días).

4. CONTEO DE COLAS Y PREDICCIÓN DE COSECHA:
   - "bud_sites_count": Suma total de colas/ápices florales principales visibles en toda la carpa.
   - "estimated_yield_grams": Estimación realista en gramos secos para el lote según densidad de colas y cobertura.
   - "harvest_readiness_pct": Promedio global de maduración (0-100%).

5. AUDITORÍA DE FOTOPERÍODO Y RITMO CIRCADIANO (SOPORTE PARA CICLOS >24 HS):
   - "photoperiod_audit": "LIGHTS_ON_OK" si hay luz normal, "LIGHTS_OFF_OK" si está oscuro en horario nocturno, "LIGHT_LEAK_ALERT" si se detecta contaminación lumínica.
   - "circadian_turgor_state": "PEAK_PRAYING" (hojas a 45°), "NORMAL_ASSIMILATION", "CIRCADIAN_ANTICIPATION_REST" (descanso normal pre-apagado), o "STRESS_DROOP".
   - ATENCIÓN A FOTOPERÍODOS EXTENDIDOS (>24 HS): Revisa "fertilization_plan_context.photoperiod_metrics". Si "is_extended_photoperiod_over_24h" es true (ej. 18L/12O = 30h o 24L/12O = 36h), el ciclo circadiano dura más de 24h y las fases fenológicas pueden estirarse. Evalúa el progreso de floración por los "biological_cycles_completed" y el hinchazón real de cálices, evitando recomendar el corte prematuro de Nitrógeno (Flora Sem 6) si la planta aún está en engorde floral activo debido al estiramiento del fotoperíodo.

6. CORRELACIÓN CON EL PLAN DE FERTILIZACIÓN SEMANAL ("fertilization_plan_context"):
   - Cruza la reacción visual de la planta (postura foliar PRAYING/CLAWING/DROOPING, puntas quemadas, clorosis o antocianinas) con la semana activa del Plan de Fertilización ("active_week_target": EC objetivo, pH objetivo, PPM 500, dosis de Hybrids/Short Flowering, PK Booster, Calcium y riego secundario con BioEnhancer/Big One) y los últimos riegos en "recent_events".
   - En "diagnosis" y "recommendations", incluye explícitamente cómo está reaccionando el lote al Plan de Fertilización de la semana actual y si conviene mantener el 100% de la dosis mineral, reducirla (-20% a -25% por garras/puntas quemadas) o reforzar Ca/Mg/PK.

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
{
  "crop_detected": true,
  "phenological_stage_detected": "FLOWERING_MID",
  "health_score": 90,
  "canopy_coverage_pct": 78,
  "daily_growth_delta_pct": 2.4,
  "leaf_posture": "PRAYING",
  "circadian_turgor_state": "PEAK_PRAYING",
  "light_stress": "OPTIMAL",
  "photoperiod_audit": "LIGHTS_ON_OK",
  "bud_sites_count": 42,
  "estimated_yield_grams": 380,
  "harvest_readiness_pct": 65,
  "lifecycle_advisors": {
    "topping_lst_advice": "Estructura apical consolidada.",
    "scrog_tucking_advice": "Guiar ramas centrales de A2 hacia el borde superior izquierdo de A1.",
    "optimal_flip_advice": "Lote ya en floración con cobertura óptima.",
    "defoliation_advice": "Deshojar 4-5 hojas abanico internas entre B1 y B2 para liberar flujo de aire.",
    "staggered_harvest_advice": "Nicole Punch (A1-A3) presenta maduración 7 días más avanzada que Gorilla Glue (B3)."
  },
  "per_plant_analysis": [
    {
      "zone_id": "A1",
      "plant_name": "Nicole Punch #1",
      "strain": "Nicole Punch",
      "health_score": 92,
      "canopy_share_pct": 85,
      "leaf_posture": "PRAYING",
      "pheno_traits_observed": "Foliolo ancho índico, pigmentación púrpura genética en bordes",
      "bud_count": 8,
      "maturity_pct": 75,
      "harvest_status": "FLUSH_WINDOW",
      "anthocyanin_expression": "GENETIC_NORMAL",
      "specific_diagnosis": "Vigor excelente y senescencia limpia.",
      "specific_action": "Iniciar lavado de raíces en 3 días."
    }
  ],
  "deficiencies": [],
  "pests_detected": [],
  "issues_detected": [],
  "diagnosis": "Diagnóstico agronómico integral.",
  "recommendations": "Recomendaciones operativas.",
  "suggested_actions": []
}`;

        let parsedResult: VisionAnalysisResult;

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
                        'X-Title': 'CRM Cannabis Vision Agent v2',
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
                    console.warn('[VisionAgentEngine] Intento con gemini-2.5-flash fallo, intentando fallback...');
                    aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${openRouterKey}`,
                            'HTTP-Referer': 'https://cannabiscrm.com',
                            'X-Title': 'CRM Cannabis Vision Agent v2',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'google/gemini-2.5-flash-lite',
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

        // 6. Normalizar y validar estrictamente según crop_detected
        const isCrop = parsedResult.crop_detected ?? (
            parsedResult.health_score !== null &&
            (parsedResult.health_score ?? 0) > 0 &&
            (parsedResult.canopy_coverage_pct ?? 0) > 0
        );

        const finalHealthScore = isCrop ? (parsedResult.health_score ?? 80) : 0;
        const finalCanopy = isCrop ? (parsedResult.canopy_coverage_pct ?? 0) : 0;
        const finalGrowthDelta = isCrop
            ? (parsedResult.daily_growth_delta_pct ?? (prevCanopyCoverage !== null ? Number((finalCanopy - prevCanopyCoverage).toFixed(1)) : 0))
            : 0;
        const finalPosture = isCrop ? (parsedResult.leaf_posture || 'TURGID') : 'NONE';
        const finalLightStress = isCrop ? (parsedResult.light_stress || 'OPTIMAL') : 'NONE';
        const finalStage = isCrop ? (parsedResult.phenological_stage_detected || 'FLOWERING_MID') : 'NONE';
        const finalCircadian = isCrop ? (parsedResult.circadian_turgor_state || 'NORMAL_ASSIMILATION') : 'NONE';
        const finalBudCount = isCrop ? (parsedResult.bud_sites_count ?? 0) : 0;
        const finalEstYield = isCrop ? (parsedResult.estimated_yield_grams ?? 0) : 0;
        const finalHarvestReadiness = isCrop ? (parsedResult.harvest_readiness_pct ?? 0) : 0;
        const finalPerPlant = isCrop
            ? reconcilePerPlantAnalysis(plantGrid, parsedResult.per_plant_analysis, {
                  stage: finalStage,
                  health_score: finalHealthScore,
                  crop_detected: isCrop
              })
            : [];
        const finalAdvisors: LifecycleAdvisors = isCrop && parsedResult.lifecycle_advisors ? parsedResult.lifecycle_advisors : {
            topping_lst_advice: 'Sin cultivo detectado en escena.',
            scrog_tucking_advice: 'Posicione la cámara sobre la malla SCROG para recibir guías de entrenamiento.',
            optimal_flip_advice: 'Pendiente de detección de dosel.',
            defoliation_advice: 'Sin follaje detectado para mapa de deshoje.',
            staggered_harvest_advice: 'Configure sus genéticas en la pestaña Mapa de Plantas.'
        };

        const planCorrelation: VisionPlanCorrelation | undefined = resolvedFertPlan
            ? evaluateVisionPlanCorrelation(
                  resolvedFertPlan,
                  {
                      health_score: finalHealthScore,
                      leaf_posture: finalPosture,
                      issues_detected: parsedResult.issues_detected || [],
                      deficiencies: parsedResult.deficiencies || [],
                      recommendations: parsedResult.recommendations || '',
                      created_at: new Date().toISOString()
                  }
              )
            : undefined;

        // 7. Guardar en la base de datos `core_image_analyses`
        try {
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
                    phenological_stage_detected: finalStage,
                    canopy_coverage_pct: finalCanopy,
                    daily_growth_delta_pct: finalGrowthDelta,
                    leaf_posture: finalPosture,
                    circadian_turgor_state: finalCircadian,
                    light_stress: finalLightStress,
                    photoperiod_audit: parsedResult.photoperiod_audit || 'LIGHTS_ON_OK',
                    bud_sites_count: finalBudCount,
                    estimated_yield_grams: finalEstYield,
                    harvest_readiness_pct: finalHarvestReadiness,
                    lifecycle_advisors: finalAdvisors,
                    per_plant_analysis: finalPerPlant,
                    deficiencies: parsedResult.deficiencies || [],
                    pests_detected: parsedResult.pests_detected || [],
                    fertilization_plan_correlation: planCorrelation
                }
            }).select();

            if (insertError) {
                console.error('[VisionAgentEngine] ❌ Error insertando en core_image_analyses:', insertError);
            } else {
                console.log('[VisionAgentEngine] ✅ Análisis v2.0 persistido en core_image_analyses:', inserted?.[0]?.id);
            }
        } catch (dbErr) {
            console.error('[VisionAgentEngine] Error al guardar en core_image_analyses:', dbErr);
        }

        return {
            ...parsedResult,
            crop_detected: isCrop,
            phenological_stage_detected: finalStage,
            health_score: finalHealthScore,
            canopy_coverage_pct: finalCanopy,
            daily_growth_delta_pct: finalGrowthDelta,
            leaf_posture: finalPosture,
            circadian_turgor_state: finalCircadian,
            light_stress: finalLightStress,
            bud_sites_count: finalBudCount,
            estimated_yield_grams: finalEstYield,
            harvest_readiness_pct: finalHarvestReadiness,
            lifecycle_advisors: finalAdvisors,
            per_plant_analysis: finalPerPlant,
            fertilization_plan_correlation: planCorrelation
        };
    }

    /**
     * Re-analiza la captura cenital más reciente en disco utilizando el mapa espacial actual (plant_grid.json).
     */
    static async reanalyzeLatestCaptureWithCurrentGrid(): Promise<VisionAnalysisResult | null> {
        try {
            const capturesDir = fs.existsSync('/var/www/captures/crop_vision')
                ? '/var/www/captures/crop_vision'
                : path.join(process.cwd(), 'public', 'captures');

            if (!fs.existsSync(capturesDir)) return null;

            const files = fs.readdirSync(capturesDir)
                .filter(f => (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')) && f !== 'foto_prueba.jpg')
                .map(f => ({
                    name: f,
                    fullPath: path.join(capturesDir, f),
                    mtime: fs.statSync(path.join(capturesDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length === 0) return null;

            const latestFile = files[0];
            const buffer = fs.readFileSync(latestFile.fullPath);
            const base64Data = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            const publicUrl = `/captures/${latestFile.name}`;

            console.log(`[VisionAgentEngine] 🔄 Re-analizando captura ${latestFile.name} con el mapa espacial actualizado...`);
            return await this.analyzeCenitalCapture(base64Data, publicUrl);
        } catch (err: any) {
            console.error('[VisionAgentEngine] Error en reanalyzeLatestCaptureWithCurrentGrid:', err.message);
            return null;
        }
    }

    private static async fallbackGemini(prompt: string, base64Url: string, apiKey: string): Promise<VisionAnalysisResult> {
        if (!apiKey) throw new Error('GEMINI_API_KEY no disponible para fallback');

        const parts = base64Url.split(';base64,');
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        const base64Content = parts[1] || '';

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
