/**
 * Motor Integral de Planes de Fertilización Semanal por Lote,
 * Soporte para Fotoperiodos Extendidos (>24h / Estiramiento de Fases),
 * Importador de Google Sheets y Correlación Bidireccional con Visión IA.
 */

export interface PlanNutrientDose {
  product_name: string;
  dose: number; // ej. 0.5
  dose_uom: 'g/L' | 'ml/L';
  origin_type?: 'mineral' | 'organico' | 'biologico';
  note?: string;
}

export interface FertilizationPlanWeek {
  week_id: string;
  stage: 'vegetativo' | 'floración';
  week_number: number; // 1..4 en Veg, 1..8 en Flora
  label: string; // Ej: "Semana 1" o "Flora Sem 3"
  phenology: string; // Ej: "Cuajado e Inicio Booster"
  primary_nutrients: PlanNutrientDose[];
  primary_summary: string;
  secondary_nutrients: PlanNutrientDose[];
  secondary_summary: string;
  target_ph_min: number;
  target_ph_max: number;
  target_ec_min: number;
  target_ec_max: number;
  target_ppm_min: number;
  target_ppm_max: number;
  notes: string;
}

export interface TechnicalProtocolSection {
  title: string;
  bullets: string[];
}

export interface FertilizationPlan {
  id: string;
  name: string;
  subtitle: string;
  strain_target: string;
  substrate_type: string;
  tank_reference_liters: number;
  water_per_plant_liters: number;
  base_water_ec: number;
  base_water_ppm: number;
  tds_scale: number;
  nutrition_strategy: string;
  source_sheet_url?: string;
  weeks_schedule: FertilizationPlanWeek[];
  technical_protocols: TechnicalProtocolSection[];
}

export interface BatchPlanResolution {
  plan: FertilizationPlan;
  currentStage: 'vegetativo' | 'floración' | 'cosecha' | 'finalizado';
  // Fotoperiodo (>24h soporte nativo)
  lightHours: number;
  darkHours: number;
  cycleTotalHours: number;
  isExtendedPhotoperiod: boolean;
  photoperiodStretchFactor: number; // (L+O)/24, ej. 30/24 = 1.25x
  calendarDaysPerPhenoWeek: number; // ej. 7 * 1.25 = 8.75 días calendario por semana fenológica
  // Tiempos en etapa actual
  calendarDaysInStage: number;
  calendarWeekInStage: number;
  totalHoursInStage: number;
  biologicalCyclesCompleted: number;
  biologicalWeekInStage: number;
  // Semana efectiva seleccionada
  syncMode: 'biological_cycles' | 'calendar_days';
  weekOffset: number;
  effectiveWeekNumber: number;
  maxStageWeeksInPlan: number;
  isPhaseStretched: boolean;
  stretchExplanation: string | null;
  activeWeek: FertilizationPlanWeek;
  // Volumen sugerido para el lote
  numPlants: number;
  suggestedBatchWaterLiters: number;
  // Alternancia de riego sugerida según historial
  recommendedMode: 'primary' | 'secondary';
  recommendedModeReason: string;
}

export interface VisionPlanCorrelation {
  status:
    | 'OPTIMAL_RESPONSE'
    | 'OVERFEEDING_ALERT'
    | 'UNDERFEEDING_DEFICIENCY'
    | 'PLANNED_SENESCENCE_OK'
    | 'PHOTOPERIOD_STRETCH_HOLD'
    | 'PH_LOCKOUT_WARNING';
  badgeLabel: string;
  badgeColor: string;
  headline: string;
  explanation: string;
  recommendedActionLabel: string;
  doseMultiplier: number; // 1.0 = 100%, 0.8 = -20%, 1.1 = +10%
  recommendedIrrigationMode: 'primary' | 'secondary';
  adjustedNutrients: PlanNutrientDose[];
  lastVisionTimestamp?: string | null;
  lastVisionHealthScore?: number | null;
  lastVisionPosture?: string | null;
}

/**
 * PLAN MAESTRO OFICIAL PREINSTALADO (Extraído del Google Sheet del usuario:
 * "PROGRAMA DE FERTILIZACIÓN PERSONALIZADO • RED HOT COOKIES")
 */
export const RED_HOT_COOKIES_FEEDING_PLAN: FertilizationPlan = {
  id: 'plan-red-hot-cookies-feeding',
  name: 'Plan Piloto • Red Hot Cookies (Green House Feeding + Top Crop)',
  subtitle: 'Green House Feeding (Sales Minerales) + Aditivos Top Crop | Sustrato con Perlita | Bidón 20L',
  strain_target: 'Red Hot Cookies (Sweet Seeds • 4 Sem Veg + 8 Sem Flora)',
  substrate_type: 'Sustrato con Perlita (Macetas 20L)',
  tank_reference_liters: 20,
  water_per_plant_liters: 2.4,
  base_water_ec: 0.38,
  base_water_ppm: 181,
  tds_scale: 500,
  nutrition_strategy: 'Feeding Powder (Grow / Short Flow. / Booster PK) + Top Crop (Barrier / Deeper / Big One) + BioEnhancer',
  source_sheet_url: 'https://docs.google.com/spreadsheets/d/1S_WwJzAy0mzaA7rRXLdDw5_05DDrF2B0UBs0AwqrLMc/edit?usp=sharing',
  weeks_schedule: [
    // ==================== FASE 1: VEGETATIVO (4 SEMANAS) ====================
    {
      week_id: 'veg-1',
      stage: 'vegetativo',
      week_number: 1,
      label: 'Semana 1',
      phenology: 'Arranque y Enraizamiento',
      primary_nutrients: [
        { product_name: 'Feeding Grow', dose: 0.3, dose_uom: 'g/L', origin_type: 'mineral' },
        { product_name: 'Deeper Underground', dose: 1.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Feeding Grow 0.3 g/L + Deeper Underg. 1.0 ml/L',
      secondary_nutrients: [],
      secondary_summary: 'Sólo agua reposada (desclorada)',
      target_ph_min: 5.8,
      target_ph_max: 6.0,
      target_ec_min: 0.7,
      target_ec_max: 0.9,
      target_ppm_min: 350,
      target_ppm_max: 450,
      notes: 'Inocular raíces con Deeper. Riego suave alrededor del tallo para estimular raíces.'
    },
    {
      week_id: 'veg-2',
      stage: 'vegetativo',
      week_number: 2,
      label: 'Semana 2',
      phenology: 'Crecimiento Vegetativo',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico', note: 'Verter primero y esperar 5 min' },
        { product_name: 'Feeding Grow', dose: 0.5, dose_uom: 'g/L', origin_type: 'mineral' },
        { product_name: 'Deeper Underground', dose: 1.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Top Barrier 0.5 ml/L + Feeding Grow 0.5 g/L + Deeper 1.0 ml/L',
      secondary_nutrients: [],
      secondary_summary: 'Sólo agua reposada (desclorada)',
      target_ph_min: 5.8,
      target_ph_max: 6.0,
      target_ec_min: 0.8,
      target_ec_max: 0.9,
      target_ppm_min: 400,
      target_ppm_max: 450,
      notes: 'Incorporar Silicio (Barrier) primero para reforzar paredes celulares. Esperar 5 min.'
    },
    {
      week_id: 'veg-3',
      stage: 'vegetativo',
      week_number: 3,
      label: 'Semana 3',
      phenology: 'Desarrollo Vigoroso',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico', note: 'Verter primero y esperar 5 min' },
        { product_name: 'Feeding Grow', dose: 0.7, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Top Barrier 0.5 ml/L + Feeding Grow 0.7 g/L',
      secondary_nutrients: [
        { product_name: 'Feeding Bio Enhancer', dose: 0.5, dose_uom: 'g/L', origin_type: 'organico', note: 'En agua sola (no mezclar con sales)' }
      ],
      secondary_summary: 'BioEnhancer 0.5 g/L (10.0 g en 20L de agua sola)',
      target_ph_min: 6.0,
      target_ph_max: 6.2,
      target_ec_min: 1.0,
      target_ec_max: 1.2,
      target_ppm_min: 500,
      target_ppm_max: 600,
      notes: 'Retirar Deeper. BioEnhancer cada 14 días en riego secundario (no mezclar con sales).'
    },
    {
      week_id: 'veg-4',
      stage: 'vegetativo',
      week_number: 4,
      label: 'Semana 4',
      phenology: 'Pre-inducción (Pre-12/12)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico', note: 'Verter primero y esperar 5 min' },
        { product_name: 'Feeding Grow', dose: 0.8, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Top Barrier 0.5 ml/L + Feeding Grow 0.8 g/L',
      secondary_nutrients: [
        { product_name: 'Big One', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico', note: '3 a 5 días antes de pasar a floración' }
      ],
      secondary_summary: 'Big One 2.0 ml/L (40.0 ml en 20L de agua sola)',
      target_ph_min: 6.0,
      target_ph_max: 6.2,
      target_ec_min: 1.1,
      target_ec_max: 1.2,
      target_ppm_min: 550,
      target_ppm_max: 600,
      notes: 'Aplicar Big One en riego 3 a 5 días antes del cambio a floración para inducir preflores.'
    },

    // ==================== FASE 2: FLORACIÓN (8 SEMANAS) ====================
    {
      week_id: 'flora-1',
      stage: 'floración',
      week_number: 1,
      label: 'Flora Sem 1',
      phenology: 'Stretch y Transición',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico', note: 'Verter primero y esperar 5 min' },
        { product_name: 'Feeding Short Flowering', dose: 0.5, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Top Barrier 0.5 ml/L + Short Flowering 0.5 g/L',
      secondary_nutrients: [
        { product_name: 'Feeding Bio Enhancer', dose: 0.5, dose_uom: 'g/L', origin_type: 'organico', note: 'En agua sola (no mezclar con sales)' }
      ],
      secondary_summary: 'BioEnhancer 0.5 g/L (10.0 g en 20L de agua sola)',
      target_ph_min: 6.2,
      target_ph_max: 6.2,
      target_ec_min: 1.0,
      target_ec_max: 1.2,
      target_ppm_min: 500,
      target_ppm_max: 600,
      notes: 'Paso a fotoperiodo de floración. Transición a Short Flowering. Estiramiento vegetativo.'
    },
    {
      week_id: 'flora-2',
      stage: 'floración',
      week_number: 2,
      label: 'Flora Sem 2',
      phenology: 'Botones Florales',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico', note: 'Verter primero y esperar 5 min' },
        { product_name: 'Feeding Short Flowering', dose: 0.7, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Top Barrier 0.5 ml/L + Short Flowering 0.7 g/L',
      secondary_nutrients: [
        { product_name: 'Big One', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico', note: 'Segunda y última aplicación floral' }
      ],
      secondary_summary: 'Big One 2.0 ml/L (40.0 ml en 20L de agua sola)',
      target_ph_min: 6.2,
      target_ph_max: 6.3,
      target_ec_min: 1.1,
      target_ec_max: 1.3,
      target_ppm_min: 550,
      target_ppm_max: 650,
      notes: 'Segunda y última dosis de Big One. Primeros cúmulos de pistilos visibles.'
    },
    {
      week_id: 'flora-3',
      stage: 'floración',
      week_number: 3,
      label: 'Flora Sem 3',
      phenology: 'Cuajado e Inicio Booster',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico', note: 'Última semana de Silicio' },
        { product_name: 'Feeding Short Flowering', dose: 0.8, dose_uom: 'g/L', origin_type: 'mineral' },
        { product_name: 'Feeding PK Booster', dose: 0.2, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Top Barrier 0.5 ml/L + Short Flow. 0.8 g/L + Booster PK 0.2 g/L',
      secondary_nutrients: [
        { product_name: 'Feeding Bio Enhancer', dose: 0.5, dose_uom: 'g/L', origin_type: 'organico', note: 'En agua sola (no mezclar con sales)' }
      ],
      secondary_summary: 'BioEnhancer 0.5 g/L (10.0 g en 20L de agua sola)',
      target_ph_min: 6.3,
      target_ph_max: 6.3,
      target_ec_min: 1.3,
      target_ec_max: 1.4,
      target_ppm_min: 650,
      target_ppm_max: 700,
      notes: 'Inicio suave de Booster PK. Última semana de aplicación de Top Barrier (Silicio).'
    },
    {
      week_id: 'flora-4',
      stage: 'floración',
      week_number: 4,
      label: 'Flora Sem 4',
      phenology: 'Engorde Pleno',
      primary_nutrients: [
        { product_name: 'Feeding Short Flowering', dose: 0.8, dose_uom: 'g/L', origin_type: 'mineral' },
        { product_name: 'Feeding PK Booster', dose: 0.35, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Short Flowering 0.8 g/L + Booster PK 0.35 g/L',
      secondary_nutrients: [],
      secondary_summary: 'Sólo agua reposada (desclorada)',
      target_ph_min: 6.3,
      target_ph_max: 6.4,
      target_ec_min: 1.4,
      target_ec_max: 1.5,
      target_ppm_min: 700,
      target_ppm_max: 750,
      notes: 'Retirar Top Barrier y Big One. Concentración exclusiva en engorde mineral y cálices.'
    },
    {
      week_id: 'flora-5',
      stage: 'floración',
      week_number: 5,
      label: 'Flora Sem 5',
      phenology: 'Pico de Engorde y Resina',
      primary_nutrients: [
        { product_name: 'Feeding Short Flowering', dose: 0.6, dose_uom: 'g/L', origin_type: 'mineral' },
        { product_name: 'Feeding PK Booster', dose: 0.5, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Short Flowering 0.6 g/L + Booster PK 0.5 g/L',
      secondary_nutrients: [
        { product_name: 'Feeding Bio Enhancer', dose: 0.5, dose_uom: 'g/L', origin_type: 'organico', note: 'En agua sola (no mezclar con sales)' }
      ],
      secondary_summary: 'BioEnhancer 0.5 g/L (10.0 g en 20L de agua sola)',
      target_ph_min: 6.4,
      target_ph_max: 6.4,
      target_ec_min: 1.5,
      target_ec_max: 1.6,
      target_ppm_min: 750,
      target_ppm_max: 800,
      notes: 'Pico de fósforo y potasio. Máxima producción de resina roja/púrpura y terpenos.'
    },
    {
      week_id: 'flora-6',
      stage: 'floración',
      week_number: 6,
      label: 'Flora Sem 6',
      phenology: 'Endurecimiento (Sin N)',
      primary_nutrients: [
        { product_name: 'Feeding PK Booster', dose: 0.5, dose_uom: 'g/L', origin_type: 'mineral', note: '0 g/L Short Flowering (Corte de N)' }
      ],
      primary_summary: 'Booster PK 0.5 g/L (Retiro base Short Flowering)',
      secondary_nutrients: [],
      secondary_summary: 'Sólo agua reposada (desclorada)',
      target_ph_min: 6.4,
      target_ph_max: 6.5,
      target_ec_min: 0.8,
      target_ec_max: 0.9,
      target_ppm_min: 400,
      target_ppm_max: 450,
      notes: 'Corte total de nitrógeno. La planta consume sus reservas verdes y potencia antocianinas.'
    },
    {
      week_id: 'flora-7',
      stage: 'floración',
      week_number: 7,
      label: 'Flora Sem 7',
      phenology: 'Senescencia y Maduración',
      primary_nutrients: [
        { product_name: 'Feeding PK Booster', dose: 0.25, dose_uom: 'g/L', origin_type: 'mineral' }
      ],
      primary_summary: 'Booster PK 0.25 g/L',
      secondary_nutrients: [
        { product_name: 'Feeding Bio Enhancer', dose: 0.5, dose_uom: 'g/L', origin_type: 'organico', note: 'Moviliza sales previo al lavado' }
      ],
      secondary_summary: 'BioEnhancer 0.5 g/L (10.0 g en 20L de agua sola)',
      target_ph_min: 6.4,
      target_ph_max: 6.5,
      target_ec_min: 0.6,
      target_ec_max: 0.7,
      target_ppm_min: 300,
      target_ppm_max: 350,
      notes: 'Reducción drástica de sales. BioEnhancer ayuda a movilizar sales y preparar lavado.'
    },
    {
      week_id: 'flora-8',
      stage: 'floración',
      week_number: 8,
      label: 'Flora Sem 8',
      phenology: 'Lavado Final de Raíces',
      primary_nutrients: [],
      primary_summary: '0 g/L (Sólo agua desclorada pura)',
      secondary_nutrients: [],
      secondary_summary: 'Sólo agua desclorada pura',
      target_ph_min: 6.5,
      target_ph_max: 6.5,
      target_ec_min: 0.38,
      target_ec_max: 0.38,
      target_ppm_min: 181,
      target_ppm_max: 181,
      notes: 'Lavado de raíces sin fertilizantes hasta que EC de drenaje iguale al agua base. Garantiza ceniza blanca.'
    }
  ],
  technical_protocols: [
    {
      title: '1. Protocolo de Mezcla y Orden en Bidón / Tanque (20L)',
      bullets: [
        'Paso 1: Llenar el bidón/tanque con 20L de agua desclorada (reposada 24-48h, 20-22°C).',
        'Paso 2: Si toca Top Barrier (Silicio), verter primero (0.5 ml/L = 10 ml en 20L), batir y esperar 5 a 10 min.',
        'Paso 3: Disolver sales en polvo (Grow / Short Flowering / Booster PK) en 500 ml de agua tibia antes de incorporar al tanque.',
        'Paso 4: Agregar aditivos líquidos restantes → Medir EC y PPM → Calibrar pH al final.'
      ]
    },
    {
      title: '2. Regla de Oro con BioEnhancer',
      bullets: [
        'Composición: Ácidos húmicos/fúlvicos, extracto de algas y Trichoderma.',
        'Incompatibilidad: NUNCA mezclar en el mismo bidón con sales minerales.',
        'Aplicación: Exclusivamente en riego secundario cada 14 días (0.5 g/L = 10g en 20L de agua sola).',
        'Vitalidad biológica: Preparar y aplicar en el acto; no almacenar más de 24h.'
      ]
    },
    {
      title: '3. Agua Base de Grifo y Manejo de CalMag',
      bullets: [
        'Conductividad de partida: Agua de grifo reposada con 385 µS/cm (EC 0.38 mS/cm / 181 ppm).',
        'Calcio y Magnesio: Al ser agua de dureza media, aporta suficiente Ca y Mg natural.',
        'Suplementación CalMag: NO aplicar de rutina para no saturar de sales el sustrato.',
        'Margen útil: Esta agua deja margen óptimo de EC para los nutrientes de floración.'
      ]
    },
    {
      title: '4. Riego, Volumen y Drenaje (Macetas de 20L)',
      bullets: [
        'Alternancia: 1 riego con nutrientes principales y 1 riego con agua sola / BioEnhancer / Big One.',
        'Volumen por turno: ~2.4L por maceta de 20L (~24 litros para 10 plantas).',
        'Drenaje controlado (Runoff): Buscar 10% a 15% de escorrentía para evitar acumulación de sales.',
        'Lavado final: En semana 8 regar solo con agua hasta que EC drenaje iguale al grifo (0.38 mS/cm).'
      ]
    }
  ]
};

export const TOP_CROP_27H_EXPERIMENTAL_PLAN: FertilizationPlan = {
  id: 'plan-top-crop-27h-experimental',
  name: 'Protocolo Experimental 27h (13L/14O → 10L/17O) • Top Crop + Vamp',
  subtitle: 'Línea Orgánico-Mineral Top Crop (Top Bloom / Top Bud / Top Candy / Barrier) + Big One & Vamp Poción',
  strain_target: 'Fotoperíodo Extendido 27h (Fase 1: 13L/14O • Fase 2: 10L/17O)',
  substrate_type: 'Sustrato Tierra / Turba con Perlita',
  tank_reference_liters: 20,
  water_per_plant_liters: 2.0,
  base_water_ec: 0.38,
  base_water_ppm: 181,
  tds_scale: 500,
  nutrition_strategy: 'Base Top Crop + Foliar alternado Big One / Vamp Poción en inicio de oscuridad',
  weeks_schedule: [
    {
      week_id: 'vegetativo-1',
      stage: 'vegetativo',
      week_number: 1,
      label: 'Semana 1',
      phenology: 'Enraizamiento y Trasplante',
      primary_nutrients: [
        { product_name: 'Deeper Underground', dose: 1.5, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Deeper Underground 1.5 ml/L',
      secondary_nutrients: [],
      secondary_summary: 'Solo Agua declorada',
      target_ph_min: 6.0,
      target_ph_max: 6.2,
      target_ec_min: 0.6,
      target_ec_max: 0.8,
      target_ppm_min: 300,
      target_ppm_max: 400,
      notes: 'Riego suave post-trasplante.'
    },
    {
      week_id: 'vegetativo-2',
      stage: 'vegetativo',
      week_number: 2,
      label: 'Semana 2',
      phenology: 'Desarrollo Vegetativo',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Deeper Underground', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Deeper Underground 2.0 ml/L',
      secondary_nutrients: [],
      secondary_summary: 'Solo Agua',
      target_ph_min: 6.0,
      target_ph_max: 6.2,
      target_ec_min: 0.8,
      target_ec_max: 1.0,
      target_ppm_min: 400,
      target_ppm_max: 500,
      notes: 'Fortalecimiento estructural antes de floración.'
    },
    {
      week_id: 'floración-1',
      stage: 'floración',
      week_number: 1,
      label: 'Flora Sem 1',
      phenology: 'Arranque Floración (13L/14O)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bloom', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Candy', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Top Bloom 2 ml/L + Top Candy 2 ml/L',
      secondary_nutrients: [
        { product_name: 'Big One', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Alg-A-Mic', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      secondary_summary: 'Foliar Big One 2 ml/L + Alg-A-Mic 2 ml/L (alternar con Vamp Poción)',
      target_ph_min: 6.0,
      target_ph_max: 6.3,
      target_ec_min: 1.2,
      target_ec_max: 1.4,
      target_ppm_min: 600,
      target_ppm_max: 700,
      notes: 'Fase 1 (13L/14O). Foliar al inicio de la fase oscura.'
    },
    {
      week_id: 'floración-2',
      stage: 'floración',
      week_number: 2,
      label: 'Flora Sem 2',
      phenology: 'Pre-Floración Activa (13L/14O)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bloom', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Candy', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Top Bloom 2 ml/L + Top Candy 2 ml/L',
      secondary_nutrients: [
        { product_name: 'Big One', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      secondary_summary: 'Agua + Foliar alternado Big One / Vamp Poción',
      target_ph_min: 6.0,
      target_ph_max: 6.3,
      target_ec_min: 1.3,
      target_ec_max: 1.5,
      target_ppm_min: 650,
      target_ppm_max: 750,
      notes: 'Sostener fotoperíodo 13L/14O (27h).'
    },
    {
      week_id: 'floración-3',
      stage: 'floración',
      week_number: 3,
      label: 'Flora Sem 3',
      phenology: 'Desarrollo Floral Activo (13L/14O)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bloom', dose: 3.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Candy', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bud', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Top Bloom 3 ml/L + Top Candy 2 ml/L + Top Bud 0.5 ml/L',
      secondary_nutrients: [
        { product_name: 'Big One', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      secondary_summary: 'Agua + Foliar Big One 2 ml/L',
      target_ph_min: 6.1,
      target_ph_max: 6.3,
      target_ec_min: 1.5,
      target_ec_max: 1.7,
      target_ppm_min: 750,
      target_ppm_max: 850,
      notes: 'Incorporación de Top Bud 0.5 ml/L.'
    },
    {
      week_id: 'floración-4',
      stage: 'floración',
      week_number: 4,
      label: 'Flora Sem 4',
      phenology: 'Cierre de Estimulación (13L/14O)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bloom', dose: 3.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Candy', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bud', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Top Bloom 3 ml/L + Top Candy 2 ml/L + Top Bud 0.5 ml/L',
      secondary_nutrients: [],
      secondary_summary: 'Solo Agua (Última aplicación de Big One)',
      target_ph_min: 6.1,
      target_ph_max: 6.4,
      target_ec_min: 1.6,
      target_ec_max: 1.8,
      target_ppm_min: 800,
      target_ppm_max: 900,
      notes: 'Big One se suspende al finalizar la semana 4.'
    },
    {
      week_id: 'floración-5',
      stage: 'floración',
      week_number: 5,
      label: 'Flora Sem 5',
      phenology: 'Engorde Floral Pleno (13L/14O)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bloom', dose: 3.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Candy', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bud', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Top Bloom 3 ml/L + Top Candy 2 ml/L + Top Bud 0.5 ml/L',
      secondary_nutrients: [],
      secondary_summary: 'Solo Agua',
      target_ph_min: 6.2,
      target_ph_max: 6.4,
      target_ec_min: 1.6,
      target_ec_max: 1.8,
      target_ppm_min: 800,
      target_ppm_max: 900,
      notes: 'Monitoreo semanal de tricomas y % pistilos oxidados.'
    },
    {
      week_id: 'floración-6',
      stage: 'floración',
      week_number: 6,
      label: 'Flora Sem 6',
      phenology: 'Transición a Fase 2 (10L/17O)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bloom', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bud', dose: 1.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Candy', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Top Bloom 2 ml/L + Top Bud 1 ml/L + Top Candy 2 ml/L',
      secondary_nutrients: [],
      secondary_summary: 'Solo Agua',
      target_ph_min: 6.2,
      target_ph_max: 6.4,
      target_ec_min: 1.4,
      target_ec_max: 1.6,
      target_ppm_min: 700,
      target_ppm_max: 800,
      notes: 'Al ver 70-80% pistilos oxidados, cortar luz a 10L/17O y escalar Top Bud a 1 ml/L.'
    },
    {
      week_id: 'floración-7',
      stage: 'floración',
      week_number: 7,
      label: 'Flora Sem 7',
      phenology: 'Maduración Terminal Cero N (10L/17O)',
      primary_nutrients: [
        { product_name: 'Barrier', dose: 0.5, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Bud', dose: 1.0, dose_uom: 'ml/L', origin_type: 'organico' },
        { product_name: 'Top Candy', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }
      ],
      primary_summary: 'Barrier 0.5 ml/L + Top Bud 1 ml/L + Top Candy 2 ml/L (Sin Top Bloom)',
      secondary_nutrients: [],
      secondary_summary: 'Solo Agua',
      target_ph_min: 6.2,
      target_ph_max: 6.5,
      target_ec_min: 1.0,
      target_ec_max: 1.2,
      target_ppm_min: 500,
      target_ppm_max: 600,
      notes: 'Top Bloom suspendido. Cierre de formación de cálices.'
    },
    {
      week_id: 'floración-8',
      stage: 'floración',
      week_number: 8,
      label: 'Flora Sem 8',
      phenology: 'Lavado de Raíces Final',
      primary_nutrients: [],
      primary_summary: '0 ml/L (Agua Limpia pH 6.0-6.5)',
      secondary_nutrients: [],
      secondary_summary: 'Solo Agua Limpia',
      target_ph_min: 6.0,
      target_ph_max: 6.5,
      target_ec_min: 0.4,
      target_ec_max: 0.4,
      target_ppm_min: 180,
      target_ppm_max: 200,
      notes: 'Lavado de raíces 7 a 10 días previos al corte.'
    }
  ],
  technical_protocols: [
    {
      title: '1. Indicadores de Transición a Fase 2 (13L/14O → 10L/17O)',
      bullets: [
        'Generación de pistilos blancos claramente reducida y 70-80% de pistilos oxidados.',
        'Sostener diferencial térmico de 8°C entre luz y oscuridad (17-18°C nocturno).'
      ]
    }
  ]
};

export const DEFAULT_FERTILIZATION_PLANS: FertilizationPlan[] = [
  RED_HOT_COOKIES_FEEDING_PLAN,
  TOP_CROP_27H_EXPERIMENTAL_PLAN
];

export function createBlankFertilizationPlan(customName = 'Nuevo Plan de Fertilización', strainTarget = 'General'): FertilizationPlan {
  return {
    id: `plan-custom-${Date.now()}`,
    name: customName,
    subtitle: 'Plan personalizado configurable por semana',
    strain_target: strainTarget,
    substrate_type: 'Sustrato con Perlita',
    tank_reference_liters: 20,
    water_per_plant_liters: 2.0,
    base_water_ec: 0.38,
    base_water_ppm: 181,
    tds_scale: 500,
    nutrition_strategy: 'Configuración personalizada',
    weeks_schedule: [
      {
        week_id: 'vegetativo-1',
        stage: 'vegetativo',
        week_number: 1,
        label: 'Semana 1',
        phenology: 'Inicio Vegetativo',
        primary_nutrients: [],
        primary_summary: 'Sin productos asignados',
        secondary_nutrients: [],
        secondary_summary: 'Solo Agua',
        target_ph_min: 5.8,
        target_ph_max: 6.0,
        target_ec_min: 0.8,
        target_ec_max: 1.0,
        target_ppm_min: 400,
        target_ppm_max: 500,
        notes: ''
      },
      {
        week_id: 'floración-1',
        stage: 'floración',
        week_number: 1,
        label: 'Flora Sem 1',
        phenology: 'Pre-Floración',
        primary_nutrients: [],
        primary_summary: 'Sin productos asignados',
        secondary_nutrients: [],
        secondary_summary: 'Solo Agua',
        target_ph_min: 6.0,
        target_ph_max: 6.2,
        target_ec_min: 1.2,
        target_ec_max: 1.5,
        target_ppm_min: 600,
        target_ppm_max: 750,
        notes: ''
      }
    ],
    technical_protocols: []
  };
}

/**
 * Empareja el nombre de un producto del Plan (ej. "Top Barrier", "Short Flowering", "Booster PK", "Deeper Underg.")
 * con el nombre exacto cargado en `core_inventory_quimicos` (ej. "Barrier", "Feeding Short Flowering", "Feeding PK Booster", "Deeper Underground").
 */
export function matchPlanProductToInventory(planProdName: string, inventoryList: any[]): string {
  if (!planProdName || !inventoryList || inventoryList.length === 0) return planProdName;
  const cleanPlan = planProdName.toLowerCase().trim();

  // 1. Coincidencia exacta
  const exact = inventoryList.find(i => (i.name || '').toLowerCase().trim() === cleanPlan);
  if (exact) return exact.name;

  // 2. Alias conocidos de Green House Feeding & Top Crop
  const aliasRules: Array<{ keywords: string[]; targetCheck: (invName: string) => boolean }> = [
    {
      keywords: ['barrier', 'top barrier', 'silicio'],
      targetCheck: n => n.includes('barrier')
    },
    {
      keywords: ['deeper', 'underground', 'deeper underg'],
      targetCheck: n => n.includes('deeper')
    },
    {
      keywords: ['short flowering', 'short flow'],
      targetCheck: n => n.includes('short') && n.includes('flow')
    },
    {
      keywords: ['booster pk', 'pk booster', 'feeding pk'],
      targetCheck: n => n.includes('booster') || (n.includes('pk') && n.includes('feeding'))
    },
    {
      keywords: ['feeding grow', 'grow'],
      targetCheck: n => n.includes('feeding') && n.includes('grow')
    },
    {
      keywords: ['bioenhancer', 'bio enhancer'],
      targetCheck: n => n.includes('enhancer')
    },
    {
      keywords: ['big one', 'bigone'],
      targetCheck: n => n.includes('big one')
    },
    {
      keywords: ['calmag', 'cal mag'],
      targetCheck: n => n.includes('calmag')
    },
    {
      keywords: ['pure zym', 'purezym'],
      targetCheck: n => n.includes('zym')
    }
  ];

  for (const rule of aliasRules) {
    if (rule.keywords.some(k => cleanPlan.includes(k))) {
      const found = inventoryList.find(i => rule.targetCheck((i.name || '').toLowerCase()));
      if (found) return found.name;
    }
  }

  // 3. Coincidencia parcial por subcadena
  const partial = inventoryList.find(i => {
    const invN = (i.name || '').toLowerCase().trim();
    return invN.includes(cleanPlan) || cleanPlan.includes(invN);
  });
  return partial ? partial.name : planProdName;
}

/**
 * Verifica reglas de oro e incompatibilidades de mezcla en los productos seleccionados en Bitácora.
 */
export function checkRecipeCompatibilityWarnings(productNames: string[]): {
  hasBioEnhancerConflict: boolean;
  hasBarrierProtocolNote: boolean;
  messages: Array<{ type: 'error' | 'info'; text: string }>;
} {
  const lowerNames = productNames.filter(Boolean).map(n => n.toLowerCase());
  const hasBioEnhancer = lowerNames.some(n => n.includes('enhancer'));
  const hasMineralSalts = lowerNames.some(
    n =>
      (n.includes('feeding') && !n.includes('enhancer')) ||
      n.includes('short flowering') ||
      n.includes('pk booster') ||
      n.includes('feeding grow')
  );
  const hasBarrier = lowerNames.some(n => n.includes('barrier'));

  const messages: Array<{ type: 'error' | 'info'; text: string }> = [];

  if (hasBioEnhancer && hasMineralSalts) {
    messages.push({
      type: 'error',
      text: '⚠️ REGLA DE ORO BIOENHANCER: ¡Nunca mezclar Feeding Bio Enhancer en el mismo bidón con sales minerales (Grow / Short Flowering / Booster PK)! Aplicá BioEnhancer exclusivamente en riego secundario con agua sola.'
    });
  }

  if (hasBarrier && lowerNames.length > 1) {
    messages.push({
      type: 'info',
      text: '🧪 Protocolo Silicio (Top Barrier): Verter primero el Barrier en el agua, batir bien y esperar de 5 a 10 minutos antes de agregar las sales minerales disueltas.'
    });
  }

  return {
    hasBioEnhancerConflict: hasBioEnhancer && hasMineralSalts,
    hasBarrierProtocolNote: hasBarrier && lowerNames.length > 1,
    messages
  };
}

/**
 * Calcula la Semana Activa del Plan de Fertilización para un Lote (`core_batches`),
 * contemplando Fotoperiodos Extendidos (>24h), Ciclos Biológicos (L+O), Días Calendario
 * y Estiramiento Elástico de Fases.
 */
export function resolveBatchActivePlanWeek(
  batch: any,
  plan: FertilizationPlan = RED_HOT_COOKIES_FEEDING_PLAN,
  recentEvents: any[] = [],
  overrideOptions?: {
    weekOffset?: number;
    syncMode?: 'biological_cycles' | 'calendar_days';
  }
): BatchPlanResolution {
  const rawStage = (batch?.stage || 'vegetativo').toLowerCase();
  const currentStage: 'vegetativo' | 'floración' | 'cosecha' | 'finalizado' =
    rawStage.includes('flor')
      ? 'floración'
      : rawStage.includes('cos')
      ? 'cosecha'
      : rawStage.includes('fin')
      ? 'finalizado'
      : 'vegetativo';

  // Fotoperiodo actual del lote (soporta >24h ej. 18L/12O = 30h, 24L/12O = 36h)
  const defaultLight = currentStage === 'floración' ? 12 : 18;
  const defaultDark = currentStage === 'floración' ? 12 : 6;
  const lightHours = Number(batch?.light_hours) > 0 ? Number(batch.light_hours) : defaultLight;
  const darkHours = Number(batch?.dark_hours) >= 0 && batch?.dark_hours !== null && batch?.dark_hours !== undefined && batch?.dark_hours !== ''
    ? Number(batch.dark_hours)
    : defaultDark;
  const cycleTotalHours = Math.max(1, lightHours + darkHours);
  const isExtendedPhotoperiod = cycleTotalHours > 24;
  const photoperiodStretchFactor = Number((cycleTotalHours / 24).toFixed(2));
  const calendarDaysPerPhenoWeek = Number((7 * photoperiodStretchFactor).toFixed(1));

  // Días calendario transcurridos en la etapa actual
  const lastDateStr = batch?.last_stage_date || batch?.start_date || batch?.created_at;
  const calendarDaysInStage = lastDateStr
    ? Math.max(0, Math.floor((Date.now() - new Date(lastDateStr).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const calendarWeekInStage = Math.floor(calendarDaysInStage / 7) + 1;

  // Ciclos biológicos completados considerando (L + O) horas por ciclo
  const totalHoursInStage = calendarDaysInStage * 24;
  const biologicalCyclesCompleted = Number((totalHoursInStage / cycleTotalHours).toFixed(1));
  const biologicalWeekInStage = Math.floor(biologicalCyclesCompleted / 7) + 1;

  const syncMode: 'biological_cycles' | 'calendar_days' =
    overrideOptions?.syncMode || batch?.plan_sync_mode || 'biological_cycles';
  const weekOffset: number =
    overrideOptions?.weekOffset !== undefined
      ? Number(overrideOptions.weekOffset)
      : Number(batch?.plan_week_offset || 0);

  // Filtrar las semanas del plan para la etapa correspondiente (si está en cosecha/finalizado usamos última de floración)
  const targetPlanStage = currentStage === 'vegetativo' ? 'vegetativo' : 'floración';
  const stageWeeks = plan.weeks_schedule
    .filter(w => w.stage === targetPlanStage)
    .sort((a, b) => a.week_number - b.week_number);

  const maxStageWeeksInPlan = stageWeeks.length || (targetPlanStage === 'vegetativo' ? 4 : 8);

  const baseWeekNumber =
    currentStage === 'cosecha' || currentStage === 'finalizado'
      ? maxStageWeeksInPlan
      : syncMode === 'biological_cycles'
      ? biologicalWeekInStage
      : calendarWeekInStage;

  const rawWantedWeek = baseWeekNumber + weekOffset;
  const isPhaseStretched = rawWantedWeek > maxStageWeeksInPlan || isExtendedPhotoperiod;

  let effectiveWeekNumber = Math.max(1, Math.min(maxStageWeeksInPlan, rawWantedWeek));

  // Si está en vegetativo extendido (>4 semanas) se mantiene en la última semana de Veg (Semana 4).
  // Si está en floración y supera las semanas por estiramiento pero aún no está en cosecha, permite estirar o usar el offset.
  let stretchExplanation: string | null = null;
  if (isExtendedPhotoperiod && calendarWeekInStage !== biologicalWeekInStage) {
    stretchExplanation = `Fotoperiodo extendido ${lightHours}L/${darkHours}O (${cycleTotalHours}h/ciclo = ${photoperiodStretchFactor}x): Día ${calendarDaysInStage} calendario equivale a ${biologicalCyclesCompleted} ciclos biológicos (Semana Fenológica ${biologicalWeekInStage} en vez de Semana Calendario ${calendarWeekInStage}).`;
  } else if (rawWantedWeek > maxStageWeeksInPlan) {
    stretchExplanation = `Fase estirada: El lote cursa la semana ${rawWantedWeek} de ${targetPlanStage} (el plan base tiene ${maxStageWeeksInPlan} semanas). Podés ajustar la semana activa con los botones (- / +) si la planta sigue en engorde.`;
  }

  const activeWeek =
    stageWeeks.find(w => w.week_number === effectiveWeekNumber) ||
    stageWeeks[stageWeeks.length - 1] ||
    plan.weeks_schedule[0];

  const numPlants = Math.max(1, Number(batch?.num_plants) || 10);
  const suggestedBatchWaterLiters = Number((numPlants * (plan.water_per_plant_liters || 2.4)).toFixed(1));

  // Detectar si el próximo riego sugerido es el Principal (Sales) o el Secundario (Agua / BioEnhancer / Big One)
  let recommendedMode: 'primary' | 'secondary' = 'primary';
  let recommendedModeReason = 'Toca Riego Principal con nutrición mineral de la semana.';

  const riegoEvents = (recentEvents || []).filter(ev => {
    const t = (ev.event_type || '').toLowerCase();
    return t === 'riego' || t === 'nutricion';
  });

  if (riegoEvents.length > 0) {
    const lastRiego = riegoEvents[0];
    const descUpper = (lastRiego.description || '').toUpperCase();
    const hadMineralLastTime =
      descUpper.includes('RIEGO MINERAL') ||
      descUpper.includes('FEEDING GROW') ||
      descUpper.includes('SHORT FLOWERING') ||
      descUpper.includes('PK BOOSTER') ||
      (lastRiego.ec_water && Number(lastRiego.ec_water) > 0.6);

    if (hadMineralLastTime) {
      recommendedMode = 'secondary';
      recommendedModeReason = `El último riego registrado fue con sales minerales → por regla de alternancia 1 a 1 hoy corresponde el 🅱️ Riego Secundario (${activeWeek.secondary_summary}).`;
    } else {
      recommendedMode = 'primary';
      recommendedModeReason = `El último riego fue secundario/agua → hoy corresponde el 🅰️ Riego Principal (${activeWeek.primary_summary}).`;
    }
  }

  return {
    plan,
    currentStage,
    lightHours,
    darkHours,
    cycleTotalHours,
    isExtendedPhotoperiod,
    photoperiodStretchFactor,
    calendarDaysPerPhenoWeek,
    calendarDaysInStage,
    calendarWeekInStage,
    totalHoursInStage,
    biologicalCyclesCompleted,
    biologicalWeekInStage,
    syncMode,
    weekOffset,
    effectiveWeekNumber,
    maxStageWeeksInPlan,
    isPhaseStretched,
    stretchExplanation,
    activeWeek,
    numPlants,
    suggestedBatchWaterLiters,
    recommendedMode,
    recommendedModeReason
  };
}

/**
 * Cruza el diagnóstico más reciente de Visión IA con el Plan de Fertilización Activo
 * y el Fotoperiodo (>24h), devolviendo la correlación fisiológica y la receta ajustada.
 */
export function evaluateVisionPlanCorrelation(
  resolution: BatchPlanResolution,
  latestVisionAnalysis: any | null
): VisionPlanCorrelation {
  const { activeWeek, isExtendedPhotoperiod, calendarWeekInStage, biologicalWeekInStage, cycleTotalHours, lightHours, darkHours } = resolution;

  // Si existe correlación explícita calculada por el LLM en context_snapshot, usarla o enriquecerla
  const snap = latestVisionAnalysis?.context_snapshot || {};
  const posture = (latestVisionAnalysis?.leaf_posture || snap?.leaf_posture || 'TURGID').toUpperCase();
  const healthScore = latestVisionAnalysis?.health_score ?? 88;
  const stageDetected = (latestVisionAnalysis?.phenological_stage_detected || snap?.phenological_stage_detected || '').toUpperCase();
  const issuesText = [
    ...(latestVisionAnalysis?.issues_detected || []),
    ...(snap?.deficiencies || []),
    latestVisionAnalysis?.recommendations || ''
  ]
    .join(' ')
    .toLowerCase();

  // 1. Caso: Lote en Flora Sem 6–8 (Corte de Nitrógeno / Senescencia y Lavado programado en el Plan)
  if (activeWeek.stage === 'floración' && activeWeek.week_number >= 6) {
    // Pero si el fotoperiodo es >24h y la Visión IA aún detecta engorde medio (FLOWERING_MID) sin madurez suficiente
    if (
      isExtendedPhotoperiod &&
      stageDetected === 'FLOWERING_MID' &&
      (latestVisionAnalysis?.harvest_readiness_pct ?? 50) < 60 &&
      activeWeek.week_number === 6
    ) {
      const flora5 = resolution.plan.weeks_schedule.find(w => w.stage === 'floración' && w.week_number === 5) || activeWeek;
      return {
        status: 'PHOTOPERIOD_STRETCH_HOLD',
        badgeLabel: '⏳ Estiramiento por Fotoperiodo >24h Detectado',
        badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
        headline: `Visión IA sugiere mantener Engorde (Flora Sem 5) antes de cortar Nitrógeno`,
        explanation: `Tu fotoperiodo de ${cycleTotalHours}h (${lightHours}L/${darkHours}O) estira la maduración floral y la cámara cenital aún observa cálices en engorde pleno (FLOWERING_MID). Se recomienda sostener una semana más de Short Flowering + Booster PK antes de pasar al corte total de N de Flora Sem 6.`,
        recommendedActionLabel: 'Mantener Receta Flora Sem 5 (Engorde)',
        doseMultiplier: 1.0,
        recommendedIrrigationMode: resolution.recommendedMode,
        adjustedNutrients: flora5.primary_nutrients,
        lastVisionTimestamp: latestVisionAnalysis?.created_at || latestVisionAnalysis?.timestamp,
        lastVisionHealthScore: healthScore,
        lastVisionPosture: posture
      };
    }

    return {
      status: 'PLANNED_SENESCENCE_OK',
      badgeLabel: '🍂 Senescencia & Antocianinas Programadas OK',
      badgeColor: 'text-purple-300 bg-purple-500/15 border-purple-500/40',
      headline: `Reacción visual alineada con ${activeWeek.label} (${activeWeek.phenology})`,
      explanation: `En ${activeWeek.label} el plan retira el Nitrógeno base (Short Flowering = 0 g/L) y reduce la EC a ${activeWeek.target_ec_min}–${activeWeek.target_ec_max} mS/cm. El amarillamiento progresivo de hojas abanico y los tonos rojos/púrpuras observados por Visión IA corresponden a la movilización normal de reservas y no a una carencia patológica.`,
      recommendedActionLabel: `Aplicar ${activeWeek.label} según cronograma`,
      doseMultiplier: 1.0,
      recommendedIrrigationMode: resolution.recommendedMode,
      adjustedNutrients: activeWeek.primary_nutrients,
      lastVisionTimestamp: latestVisionAnalysis?.created_at || latestVisionAnalysis?.timestamp,
      lastVisionHealthScore: healthScore,
      lastVisionPosture: posture
    };
  }

  // 2. Caso: Exceso de sales / Hojas en Garra (CLAWING) o Quemadura de puntas detectada por Visión IA
  if (
    posture === 'CLAWING' ||
    issuesText.includes('garra') ||
    issuesText.includes('exceso') ||
    issuesText.includes('quemadura') ||
    issuesText.includes('tip burn') ||
    issuesText.includes('sobrefertiliz')
  ) {
    const reduced = activeWeek.primary_nutrients.map(n => ({
      ...n,
      dose: Number((n.dose * 0.8).toFixed(2)),
      note: 'Reducido -20% por alerta de exceso en Visión IA'
    }));
    return {
      status: 'OVERFEEDING_ALERT',
      badgeLabel: '⚠️ Exceso Mineral Visual Detectado (-20% Dosis)',
      badgeColor: 'text-red-300 bg-red-500/15 border-red-500/40',
      headline: `Visión IA detectó síntomas de saturación salina (${posture === 'CLAWING' ? 'Hojas en Garra' : 'Puntas quemadas'})`,
      explanation: `La reacción foliar frente a los últimos riegos indica estrés osmótico o exceso de Nitrógeno/sales para la semana actual (${activeWeek.label}). Se recomienda priorizar hoy el 🅱️ Riego Secundario (${activeWeek.secondary_summary}) o reducir un 20% los g/L del Riego Principal llevando la EC al límite inferior (${activeWeek.target_ec_min} mS/cm).`,
      recommendedActionLabel: 'Cargar Receta Reducida (-20% EC) o Riego Secundario',
      doseMultiplier: 0.8,
      recommendedIrrigationMode: 'secondary',
      adjustedNutrients: reduced,
      lastVisionTimestamp: latestVisionAnalysis?.created_at || latestVisionAnalysis?.timestamp,
      lastVisionHealthScore: healthScore,
      lastVisionPosture: posture
    };
  }

  // 3. Caso: Carencia / Sub-nutrición en semanas de alta demanda (Veg Sem 2-4 o Flora Sem 1-5)
  if (
    issuesText.includes('deficiencia') ||
    issuesText.includes('carencia') ||
    issuesText.includes('clorosis') ||
    issuesText.includes('amarillamiento')
  ) {
    const boosted = activeWeek.primary_nutrients.map(n => ({
      ...n,
      dose: Number((n.dose * 1.1).toFixed(2)),
      note: 'Ajustado +10% por alta demanda metabólica en Visión IA'
    }));
    return {
      status: 'UNDERFEEDING_DEFICIENCY',
      badgeLabel: '📈 Alta Demanda Nutricional (+10% Dosis / Tope EC)',
      badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
      headline: `Visión IA detecta mayor demanda mineral en ${activeWeek.label}`,
      explanation: `El dosel muestra signos de hambre mineral${isExtendedPhotoperiod ? ` acentuada por el mayor DLI del fotoperiodo de ${cycleTotalHours}h (${lightHours}L/${darkHours}O)` : ''}. Se sugiere apuntar al límite superior de EC de esta semana (${activeWeek.target_ec_max} mS/cm / ${activeWeek.target_ppm_max} ppm) y verificar que el pH esté en ${activeWeek.target_ph_min}–${activeWeek.target_ph_max}.`,
      recommendedActionLabel: 'Cargar Receta Reforzada (+10% g/L)',
      doseMultiplier: 1.1,
      recommendedIrrigationMode: 'primary',
      adjustedNutrients: boosted,
      lastVisionTimestamp: latestVisionAnalysis?.created_at || latestVisionAnalysis?.timestamp,
      lastVisionHealthScore: healthScore,
      lastVisionPosture: posture
    };
  }

  // 4. Caso: Hojas decaídas (DROOPING) -> Revisar humedad de sustrato / pH
  if (posture === 'DROOPING') {
    return {
      status: 'PH_LOCKOUT_WARNING',
      badgeLabel: '💧 Vigilar Turgencia / Oxigenación Radicular',
      badgeColor: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/40',
      headline: `Postura foliar decaída (DROOPING) en ${activeWeek.label}`,
      explanation: isExtendedPhotoperiod
        ? `Con fotoperiodo extendido de ${cycleTotalHours}h (${lightHours}L/${darkHours}O), verifica si la captura fue tomada al final del bloque de ${lightHours}h de luz (descanso circadiano normal) o si el sustrato requiere oxigenación antes de volver a regar.`
        : `Verifica el porcentaje de humedad de suelo y que el pH de entrada se mantenga estrictamente en ${activeWeek.target_ph_min}–${activeWeek.target_ph_max} con 10-15% de drenaje.`,
      recommendedActionLabel: `Mantener dosis estándar de ${activeWeek.label}`,
      doseMultiplier: 1.0,
      recommendedIrrigationMode: resolution.recommendedMode,
      adjustedNutrients: activeWeek.primary_nutrients,
      lastVisionTimestamp: latestVisionAnalysis?.created_at || latestVisionAnalysis?.timestamp,
      lastVisionHealthScore: healthScore,
      lastVisionPosture: posture
    };
  }

  // 5. Caso por defecto: Asimilación Óptima (PRAYING / TURGID)
  return {
    status: 'OPTIMAL_RESPONSE',
    badgeLabel: '✅ Asimilación Óptima del Plan (Rezo / Turgencia)',
    badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
    headline: `Respuesta foliar óptima a ${activeWeek.label} (${activeWeek.phenology})`,
    explanation: `El dosel presenta salud ${healthScore}/100 y postura ${posture === 'PRAYING' ? 'en rezo (45°)' : 'turgente'}. La planta está metabolizando perfectamente los parámetros objetivos de ${activeWeek.label} (pH ${activeWeek.target_ph_min === activeWeek.target_ph_max ? activeWeek.target_ph_min : `${activeWeek.target_ph_min}–${activeWeek.target_ph_max}`} | EC ${activeWeek.target_ec_min}–${activeWeek.target_ec_max} mS/cm | ${activeWeek.target_ppm_min}–${activeWeek.target_ppm_max} ppm).`,
    recommendedActionLabel: `Cargar ${activeWeek.label} (100% Objetivo)`,
    doseMultiplier: 1.0,
    recommendedIrrigationMode: resolution.recommendedMode,
    adjustedNutrients: activeWeek.primary_nutrients,
    lastVisionTimestamp: latestVisionAnalysis?.created_at || latestVisionAnalysis?.timestamp,
    lastVisionHealthScore: healthScore,
    lastVisionPosture: posture
  };
}

/**
 * Parsea texto CSV (proveniente de Google Sheets) para convertirlo en un FertilizationPlan.
 */
export function parseFertilizationPlanFromCsv(
  csvText: string,
  customName?: string,
  sourceUrl?: string
): FertilizationPlan {
  const lines = csvText
    .split(/\r?\n/)
    .map(l => {
      // Parse CSV row handling quotes
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    });

  const weeks: FertilizationPlanWeek[] = [];
  let currentStage: 'vegetativo' | 'floración' = 'vegetativo';
  let detectedTitle = customName || '';
  let detectedSubtitle = '';

  const parseRange = (str: string, fallback: number): [number, number] => {
    if (!str) return [fallback, fallback];
    const nums = (str.match(/[0-9]+(?:\.[0-9]+)?/g) || []).map(Number);
    if (nums.length >= 2) return [nums[0], nums[1]];
    if (nums.length === 1) return [nums[0], nums[0]];
    return [fallback, fallback];
  };

  const parseNutrientsFromString = (str: string): PlanNutrientDose[] => {
    if (!str || str.toLowerCase().includes('solo agua') || str.startsWith('0 g/L')) return [];
    const parts = str.split('+').map(p => p.trim());
    const list: PlanNutrientDose[] = [];
    for (const p of parts) {
      const m = p.match(/^(.+?)\s+([0-9]+(?:\.[0-9]+)?)\s*(g\/L|ml\/L|g|ml)/i);
      if (m) {
        const rawName = m[1].trim();
        const val = parseFloat(m[2]);
        const unitRaw = m[3].toLowerCase();
        const doseUom: 'g/L' | 'ml/L' = unitRaw.startsWith('g') ? 'g/L' : 'ml/L';
        if (val > 0) {
          list.push({
            product_name: rawName,
            dose: val,
            dose_uom: doseUom,
            origin_type:
              rawName.toLowerCase().includes('enhancer') || doseUom === 'ml/L'
                ? 'organico'
                : 'mineral'
          });
        }
      }
    }
    return list;
  };

  for (const row of lines) {
    const joined = row.join(' ').trim();
    if (!joined) continue;

    if (!detectedTitle && joined.toUpperCase().includes('PROGRAMA DE FERTILIZACI')) {
      detectedTitle = row.find(c => c.length > 5) || 'Plan Importado de Google Sheets';
      continue;
    }
    if (!detectedSubtitle && joined.includes('Bidón')) {
      detectedSubtitle = row.find(c => c.length > 10) || '';
      continue;
    }

    if (joined.toUpperCase().includes('FASE 1') || joined.toUpperCase().includes('VEGETATIVO')) {
      if (joined.toUpperCase().includes('FASE 1')) currentStage = 'vegetativo';
    }
    if (joined.toUpperCase().includes('FASE 2') || joined.toUpperCase().includes('FLORACIÓN Y ENGORDE')) {
      currentStage = 'floración';
    }

    // Detectar fila de semana (ej. "Semana 1" o "Flora Sem 1")
    const weekCol = row.find(c => /^(Semana\s*\d+|Flora\s*Sem\s*\d+)/i.test(c));
    if (weekCol) {
      const colIdx = row.indexOf(weekCol);
      const weekNumMatch = weekCol.match(/(\d+)/);
      const weekNumber = weekNumMatch ? parseInt(weekNumMatch[1], 10) : weeks.length + 1;
      const isFloraRow = /flora/i.test(weekCol) || currentStage === 'floración';
      const stageForRow: 'vegetativo' | 'floración' = isFloraRow ? 'floración' : 'vegetativo';

      const phenology = row[colIdx + 1] || '';
      const primarySummary = row[colIdx + 2] || '';
      const secondarySummary = row[colIdx + 4] || '';
      const phStr = row[colIdx + 5] || '6.0';
      const ecStr = row[colIdx + 6] || '1.0';
      const ppmStr = row[colIdx + 7] || '500';
      const notes = row[colIdx + 8] || '';

      const [phMin, phMax] = parseRange(phStr, 6.0);
      const [ecMin, ecMax] = parseRange(ecStr, 1.0);
      const [ppmMin, ppmMax] = parseRange(ppmStr, 500);

      let secondaryNutrients = parseNutrientsFromString(secondarySummary);
      if (secondaryNutrients.length === 0 && /bioenhancer/i.test(secondarySummary)) {
        secondaryNutrients = [{ product_name: 'Feeding Bio Enhancer', dose: 0.5, dose_uom: 'g/L', origin_type: 'organico' }];
      } else if (secondaryNutrients.length === 0 && /big\s*one/i.test(secondarySummary)) {
        secondaryNutrients = [{ product_name: 'Big One', dose: 2.0, dose_uom: 'ml/L', origin_type: 'organico' }];
      }

      weeks.push({
        week_id: `${stageForRow}-${weekNumber}`,
        stage: stageForRow,
        week_number: weekNumber,
        label: weekCol,
        phenology,
        primary_nutrients: parseNutrientsFromString(primarySummary),
        primary_summary: primarySummary,
        secondary_nutrients: secondaryNutrients,
        secondary_summary: secondarySummary,
        target_ph_min: phMin,
        target_ph_max: phMax,
        target_ec_min: ecMin,
        target_ec_max: ecMax,
        target_ppm_min: ppmMin,
        target_ppm_max: ppmMax,
        notes
      });
    }
  }

  if (weeks.length === 0) {
    return RED_HOT_COOKIES_FEEDING_PLAN;
  }

  return {
    ...RED_HOT_COOKIES_FEEDING_PLAN,
    id: `plan-sheet-${Date.now()}`,
    name: detectedTitle || customName || 'Plan Importado de Google Sheets',
    subtitle: detectedSubtitle || RED_HOT_COOKIES_FEEDING_PLAN.subtitle,
    source_sheet_url: sourceUrl,
    weeks_schedule: weeks
  };
}

// Caché en memoria de asignaciones de planes por lote sincronizadas con Supabase (core_protocols stage='BATCH_FERT_ASSIGN')
const batchPlanAssignmentsMemoryCache: Record<
  string,
  { planId: string; weekOffset: number; syncMode: 'biological_cycles' | 'calendar_days' }
> = {};

/**
 * Carga la lista de planes disponibles desde Supabase (`core_protocols` con stage='FERT_PLAN',
 * `core_fertilization_plans` o caché local) e hidrata las asignaciones por lote.
 */
export async function loadFertilizationPlans(supabaseClient: any): Promise<FertilizationPlan[]> {
  const plansMap = new Map<string, FertilizationPlan>();
  for (const defPlan of DEFAULT_FERTILIZATION_PLANS) {
    plansMap.set(defPlan.id, defPlan);
  }

  if (supabaseClient) {
    // 1. Cargar planes y asignaciones guardadas en `core_protocols` (tabla nativa activa en Supabase)
    try {
      const { data: protoRows, error: protoErr } = await supabaseClient
        .from('core_protocols')
        .select('*')
        .in('stage', ['FERT_PLAN', 'BATCH_FERT_ASSIGN'])
        .order('created_at', { ascending: true });

      if (!protoErr && Array.isArray(protoRows)) {
        for (const r of protoRows) {
          if (r.stage === 'FERT_PLAN' && r.content) {
            try {
              const parsedPlan: FertilizationPlan = JSON.parse(r.content);
              if (parsedPlan && parsedPlan.id && Array.isArray(parsedPlan.weeks_schedule)) {
                plansMap.set(parsedPlan.id, parsedPlan);
              }
            } catch {
              // Ignore malformed JSON
            }
          } else if (r.stage === 'BATCH_FERT_ASSIGN' && r.title && r.content) {
            try {
              const parsedAssign = JSON.parse(r.content);
              const normalized = {
                planId: parsedAssign.planId ?? '',
                weekOffset: Number(parsedAssign.weekOffset || 0),
                syncMode: (parsedAssign.syncMode || 'biological_cycles') as 'biological_cycles' | 'calendar_days'
              };
              batchPlanAssignmentsMemoryCache[r.title] = normalized;
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(`crm_batch_plan_v2_${r.title}`, JSON.stringify(normalized));
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }
      }
    } catch {
      // Ignore
    }

    // 2. Intentar también desde `core_fertilization_plans` por si la tabla dedicada existe
    try {
      const { data, error } = await supabaseClient
        .from('core_fertilization_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row.id && Array.isArray(row.weeks_schedule) && row.weeks_schedule.length > 0) {
            plansMap.set(row.id, {
              id: row.id,
              name: row.name,
              subtitle: row.subtitle || '',
              strain_target: row.strain_target || 'General',
              substrate_type: row.substrate_type || 'Sustrato con Perlita',
              tank_reference_liters: Number(row.tank_reference_liters || 20),
              water_per_plant_liters: Number(row.water_per_plant_liters || 2.4),
              base_water_ec: Number(row.base_water_ec || 0.38),
              base_water_ppm: Number(row.base_water_ppm || 181),
              tds_scale: Number(row.tds_scale || 500),
              nutrition_strategy: row.nutrition_strategy || '',
              source_sheet_url: row.source_sheet_url || undefined,
              weeks_schedule: row.weeks_schedule,
              technical_protocols: Array.isArray(row.technical_protocols)
                ? row.technical_protocols
                : RED_HOT_COOKIES_FEEDING_PLAN.technical_protocols
            });
          }
        }
      }
    } catch {
      // Fallback silencioso
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const localRaw = window.localStorage.getItem('crm_custom_fertilization_plans');
      if (localRaw) {
        const parsed: FertilizationPlan[] = JSON.parse(localRaw);
        for (const p of parsed) {
          if (p.id && Array.isArray(p.weeks_schedule)) {
            plansMap.set(p.id, p);
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  return Array.from(plansMap.values());
}

/**
 * Guarda o actualiza un Plan de Fertilización en Supabase (`core_protocols` stage='FERT_PLAN') y en caché local.
 */
export async function saveFertilizationPlan(supabaseClient: any, plan: FertilizationPlan): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const existingRaw = window.localStorage.getItem('crm_custom_fertilization_plans');
      const list: FertilizationPlan[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = list.filter(p => p.id !== plan.id);
      filtered.unshift(plan);
      window.localStorage.setItem('crm_custom_fertilization_plans', JSON.stringify(filtered));
    } catch {
      // Ignore
    }
  }

  if (!supabaseClient) return;

  // Guardar en `core_protocols` (stage = 'FERT_PLAN', topic = plan.id)
  try {
    const { data: existing } = await supabaseClient
      .from('core_protocols')
      .select('id')
      .eq('stage', 'FERT_PLAN')
      .eq('topic', plan.id)
      .limit(1);

    const payload = {
      title: plan.name,
      stage: 'FERT_PLAN',
      topic: plan.id,
      content: JSON.stringify(plan)
    };

    if (existing && existing.length > 0) {
      await supabaseClient.from('core_protocols').update(payload).eq('id', existing[0].id);
    } else {
      await supabaseClient.from('core_protocols').insert([payload]);
    }
  } catch {
    // Ignore
  }

  try {
    await supabaseClient.from('core_fertilization_plans').upsert([
      {
        id: plan.id,
        name: plan.name,
        subtitle: plan.subtitle,
        strain_target: plan.strain_target,
        substrate_type: plan.substrate_type,
        tank_reference_liters: plan.tank_reference_liters,
        water_per_plant_liters: plan.water_per_plant_liters,
        base_water_ec: plan.base_water_ec,
        base_water_ppm: plan.base_water_ppm,
        tds_scale: plan.tds_scale,
        nutrition_strategy: plan.nutrition_strategy,
        source_sheet_url: plan.source_sheet_url || null,
        weeks_schedule: plan.weeks_schedule,
        technical_protocols: plan.technical_protocols,
        updated_at: new Date().toISOString()
      }
    ]);
  } catch {
    // Fallback local ya guardado
  }
}

/**
 * Elimina un Plan de Fertilización personalizado.
 */
export async function deleteFertilizationPlan(supabaseClient: any, planId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const existingRaw = window.localStorage.getItem('crm_custom_fertilization_plans');
      if (existingRaw) {
        const list: FertilizationPlan[] = JSON.parse(existingRaw);
        const filtered = list.filter(p => p.id !== planId);
        window.localStorage.setItem('crm_custom_fertilization_plans', JSON.stringify(filtered));
      }
    } catch {
      // Ignore
    }
  }

  if (!supabaseClient) return;
  try {
    await supabaseClient.from('core_protocols').delete().eq('stage', 'FERT_PLAN').eq('topic', planId);
  } catch {
    // Ignore
  }
}

/**
 * Obtiene la configuración de plan asignado a un lote.
 * IMPORTANTE: Por defecto un lote NO tiene ningún plan asignado (`planId: ''`)
 * hasta que el usuario le asigne explícitamente un plan a ese lote.
 */
export function getBatchPlanAssignment(batch: any): {
  planId: string;
  weekOffset: number;
  syncMode: 'biological_cycles' | 'calendar_days';
} {
  const batchId = batch?.id;
  let localOverride: any = batchId ? batchPlanAssignmentsMemoryCache[batchId] : null;

  if (!localOverride && typeof window !== 'undefined' && batchId) {
    try {
      const raw = window.localStorage.getItem(`crm_batch_plan_v2_${batchId}`);
      if (raw) localOverride = JSON.parse(raw);
    } catch {
      // Ignore
    }
  }

  return {
    planId: batch?.fertilization_plan_id ?? localOverride?.planId ?? '',
    weekOffset:
      batch?.plan_week_offset !== undefined && batch?.plan_week_offset !== null
        ? Number(batch.plan_week_offset)
        : Number(localOverride?.weekOffset || 0),
    syncMode:
      (batch?.plan_sync_mode as any) ||
      localOverride?.syncMode ||
      'biological_cycles'
  };
}

export async function updateBatchPlanAssignment(
  supabaseClient: any,
  batchId: string,
  assignment: {
    planId: string;
    weekOffset: number;
    syncMode: 'biological_cycles' | 'calendar_days';
  }
): Promise<void> {
  batchPlanAssignmentsMemoryCache[batchId] = assignment;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`crm_batch_plan_v2_${batchId}`, JSON.stringify(assignment));
    } catch {
      // Ignore
    }
  }

  if (!supabaseClient) return;

  // Persistir en `core_protocols` (stage = 'BATCH_FERT_ASSIGN', title = batchId)
  try {
    const { data: existing } = await supabaseClient
      .from('core_protocols')
      .select('id')
      .eq('stage', 'BATCH_FERT_ASSIGN')
      .eq('title', batchId)
      .limit(1);

    const payload = {
      title: batchId,
      stage: 'BATCH_FERT_ASSIGN',
      topic: assignment.planId || 'NONE',
      content: JSON.stringify(assignment)
    };

    if (existing && existing.length > 0) {
      await supabaseClient.from('core_protocols').update(payload).eq('id', existing[0].id);
    } else {
      await supabaseClient.from('core_protocols').insert([payload]);
    }
  } catch {
    // Ignore
  }

  try {
    await supabaseClient
      .from('core_batches')
      .update({
        fertilization_plan_id: assignment.planId || null,
        plan_week_offset: assignment.weekOffset,
        plan_sync_mode: assignment.syncMode
      })
      .eq('id', batchId);
  } catch {
    // Fallback activo
  }
}
