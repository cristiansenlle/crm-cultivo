import { resolveNutrientProfile } from '../agronomy/nutrientProfiles';

export interface BioelectricRecord {
  mac: string;
  room_id: string;
  plant_tag: string;
  voltage_mv: number;
  baseline_mv: number;
  stress_index: number;
  event: string;
  ch1?: {
    voltage_mv: number;
    baseline_mv: number;
    stress_index: number;
    event: string;
  };
  ch2?: {
    voltage_mv: number;
    baseline_mv: number;
    stress_index: number;
    event: string;
  };
  ads_online: boolean;
  timestamp: string;
}

export interface SoilRecord {
  sensor_id: string;
  moisture_pct: number;
  created_at: string;
}

export interface ClimateRecord {
  temperature_c: number;
  humidity_percent: number;
  vpd_leaf_kpa: number;
  vpd_ambient_kpa: number;
  created_at: string;
}

export interface AgronomicEventRecord {
  id: string;
  event_type: string;
  description: string;
  date_occurred: string;
  water_liters?: number;
  amount_applied?: number;
  product_id?: string;
  product_name?: string;
  product_type?: string;
}

export interface BatchContext {
  id: string;
  strain: string;
  stage: string;
  days_in_stage: number;
  light_hours: number;
  dark_hours: number;
}

export interface ImageAnalysisContext {
  health_score: number;
  issues_detected: string;
  created_at: string;
}

export interface ProtocolContext {
  id: string;
  title: string;
  stage: string;
  content: string;
}

export interface DeviceEventContext {
  device_ip: string;
  event: string;
  created_at: string;
}

export interface ChannelAssessment {
  channel_name: string;
  channel_pin: string;
  voltage_mv: number;
  baseline_mv: number;
  delta_mv: number;
  stress_index: number;
  event: string;
  category: 'optimal' | 'info' | 'warning' | 'alert' | 'danger';
  title: string;
  description: string;
  color: string;
}

export interface DifferentialAssessment {
  gradient_mv: number;
  direction: 'acropetalo' | 'basipetalo' | 'equilibrado';
  direction_label: string;
  propagation_status: string;
  systemic_title: string;
  systemic_description: string;
  color: string;
}

export interface PhytoDiagnosisResult {
  live_metrics: {
    voltage_mv: number;
    baseline_mv: number;
    delta_mv: number;
    stress_index: number;
    event: string;
    ch1?: {
      voltage_mv: number;
      baseline_mv: number;
      delta_mv: number;
      stress_index: number;
      event: string;
    };
    ch2?: {
      voltage_mv: number;
      baseline_mv: number;
      delta_mv: number;
      stress_index: number;
      event: string;
    };
    ads_online: boolean;
    timestamp: string;
  };
  ch1_assessment: ChannelAssessment;
  ch2_assessment?: ChannelAssessment;
  differential_assessment?: DifferentialAssessment;
  state_assessment: {
    category: 'optimal' | 'info' | 'warning' | 'alert' | 'danger';
    code: string;
    title: string;
    description: string;
    color: string;
  };
  correlations: {
    hydration: {
      status: 'optima' | 'deficit_temprano' | 'estres_hidrico_severo' | 'saturacion';
      soil_moisture_pct: number | null;
      absorption_efficiency: string;
      ch1_soil_moisture_pct?: number | null;
      ch2_soil_moisture_pct?: number | null;
      ch1_status?: 'optima' | 'deficit_temprano' | 'estres_hidrico_severo' | 'saturacion';
      ch2_status?: 'optima' | 'deficit_temprano' | 'estres_hidrico_severo' | 'saturacion';
    };
    nutrition: {
      recent_product: string | null;
      active_ingredients: string[];
      response_evaluation: string;
      detected_trend: 'asimilacion_exitosa' | 'posible_deficit' | 'estable' | 'sin_datos';
    };
    circadian_and_lights: {
      photoperiod_applied: string;
      phase_days: string;
      light_state_now: 'Luz Encendida' | 'Fase Nocturna';
      circadian_health: 'sincronizado' | 'desfase_nocturno' | 'transicion_activa';
    };
    climate_vpd: {
      vpd_leaf: number | null;
      vpd_ambient: number | null;
      transpiration_status: 'optima' | 'exceso_vpd_cierre_estomatico' | 'humedad_excesiva';
    };
    visual_ai_crosscheck: {
      health_score: number | null;
      visual_issue: string | null;
      corroboration: string;
    };
  };
  recommended_protocols: {
    id: string;
    title: string;
    relevance_reason: string;
  }[];
  chart_timeline: Array<{
    time: string;
    timeLabel: string;
    voltage_mv: number;
    baseline_mv: number;
    ch1_voltage_mv?: number;
    ch1_baseline_mv?: number;
    ch2_voltage_mv?: number;
    ch2_baseline_mv?: number;
    soil_moisture_pct?: number;
    ch1_soil_moisture_pct?: number;
    ch2_soil_moisture_pct?: number;
    vpd_leaf_kpa?: number;
    is_light_on?: boolean;
    event_label?: string;
    event_type?: string;
    nutrient_info?: string;
  }>;
}

/**
 * Motor Principal de Diagnóstico Bioeléctrico y Fusión Multimodal
 */
export function analyzePhytoElectrophysiology(params: {
  bioTelemetry: BioelectricRecord[];
  soilTelemetry?: SoilRecord[];
  soilTelemetryCh1?: SoilRecord[];
  soilTelemetryCh2?: SoilRecord[];
  climateTelemetry: ClimateRecord[];
  agronomicEvents: AgronomicEventRecord[];
  batchContext: BatchContext | null;
  imageAnalyses: ImageAnalysisContext[];
  protocols: ProtocolContext[];
  deviceEvents: DeviceEventContext[];
}): PhytoDiagnosisResult {
  const {
    bioTelemetry = [],
    soilTelemetry = [],
    soilTelemetryCh1 = [],
    soilTelemetryCh2 = [],
    climateTelemetry = [],
    agronomicEvents = [],
    batchContext,
    imageAnalyses = [],
    protocols = [],
    deviceEvents = []
  } = params;

  // 1. Obtener última lectura de electrofisiología
  const latestBio = bioTelemetry.length > 0 ? bioTelemetry[0] : {
    mac: 'ESP32-Phyto',
    room_id: '',
    plant_tag: 'Planta Centinela',
    voltage_mv: 1640.0,
    baseline_mv: 1640.0,
    stress_index: 0.0,
    event: 'steady',
    ads_online: true,
    timestamp: new Date().toISOString()
  };

  const delta_mv = Number((latestBio.voltage_mv - latestBio.baseline_mv).toFixed(2));
  
  // Sensores de suelo específicos por maceta/canal
  const sList1 = soilTelemetryCh1.length > 0 ? soilTelemetryCh1 : soilTelemetry;
  const sList2 = soilTelemetryCh2.length > 0 ? soilTelemetryCh2 : sList1;
  const latestSoil1 = sList1.length > 0 ? sList1[0] : null;
  const latestSoil2 = sList2.length > 0 ? sList2[0] : null;
  const latestSoil = latestSoil1;
  const latestClimate = climateTelemetry.length > 0 ? climateTelemetry[0] : null;
  const latestImage = imageAnalyses.length > 0 ? imageAnalyses[0] : null;

  // 2. Evaluar Estado de Hidratación (Maceta 1 y Maceta 2)
  const evalHydration = (soil: SoilRecord | null, potLabel: string) => {
    let status: 'optima' | 'deficit_temprano' | 'estres_hidrico_severo' | 'saturacion' = 'optima';
    let efficiency = `${potLabel}: Respuesta de turgencia estable.`;
    if (soil) {
      if (soil.moisture_pct < 20) {
        status = 'estres_hidrico_severo';
        efficiency = `${potLabel}: Déficit crítico (<20%). Amortiguamiento bioeléctrico.`;
      } else if (soil.moisture_pct < 32) {
        status = 'deficit_temprano';
        efficiency = `${potLabel}: Humedad en declive (20-32%). Variación circadiana reducida.`;
      } else if (soil.moisture_pct > 85) {
        status = 'saturacion';
        efficiency = `${potLabel}: Sustrato saturado (>85%). Posible hipoxia radicular.`;
      }
    }
    return { status, efficiency };
  };

  const h1 = evalHydration(latestSoil1, 'Maceta 1 (CH1)');
  const h2 = evalHydration(latestSoil2, 'Maceta 2 (CH2)');
  const hydrationStatus = h1.status !== 'optima' ? h1.status : h2.status;
  const absorptionEfficiency = `${h1.efficiency} ${latestSoil2 && latestSoil2 !== latestSoil1 ? `| ${h2.efficiency}` : ''}`;

  // 3. Evaluar Mapeo Nutricional por Catálogo de Bodega
  let recentNutriProduct: string | null = null;
  let activeIngredients: string[] = [];
  let responseEvaluation = 'Línea de base metabólica estable.';
  let detectedNutriTrend: 'asimilacion_exitosa' | 'posible_deficit' | 'estable' | 'sin_datos' = 'estable';

  // Buscar última fertilización en los últimos 7 días
  const recentFert = agronomicEvents.find(e => 
    e.event_type?.toLowerCase().includes('fert') || 
    e.event_type?.toLowerCase().includes('nutri') ||
    e.product_name
  );

  if (recentFert && recentFert.product_name) {
    recentNutriProduct = recentFert.product_name;
    const profile = resolveNutrientProfile(recentFert.product_name, recentFert.product_type);
    
    if (profile) {
      activeIngredients = profile.primary_actives;
      const hoursSince = (Date.now() - new Date(recentFert.date_occurred).getTime()) / (1000 * 3600);
      
      if (hoursSince <= 24) {
        if (profile.category === 'vegetativo') {
          if (delta_mv >= 15) {
            detectedNutriTrend = 'asimilacion_exitosa';
            responseEvaluation = `Asimilación de Nitrógeno activa: Despolarización saludable detectada (+${delta_mv} mV) tras aplicar ${profile.name}.`;
          } else {
            responseEvaluation = `Fertilización reciente con ${profile.name} (${hoursSince.toFixed(1)}h). Monitoreando influjo iónico.`;
          }
        } else if (profile.category === 'microelementos' || profile.category === 'estructural_silicio') {
          detectedNutriTrend = 'asimilacion_exitosa';
          responseEvaluation = `Refuerzo de membrana activo con ${profile.name}: Estabilización bioeléctrica en curso.`;
        }
      } else {
        responseEvaluation = `Última nutrición: ${profile.name} hace ${Math.round(hoursSince / 24)} días.`;
      }
    }
  }

  // Detección preventiva de deficiencia sin fertilización
  if (!recentFert && Math.abs(delta_mv) > 45 && latestBio.stress_index > 65) {
    if (delta_mv > 45) {
      detectedNutriTrend = 'posible_deficit';
      responseEvaluation = 'Despolarización crónica sin fertilización reciente. Alerta temprana de demanda de Nitrógeno antes de clorosis.';
    } else if (delta_mv < -45) {
      detectedNutriTrend = 'posible_deficit';
      responseEvaluation = 'Hiperpolarización sostenida. Alerta temprana de déficit de Calcio o micronutrientes (Fe/Mn).';
    }
  }

  // 4. Evaluar Fotoperíodo Cargado y Ritmo Circadiano
  const photoperiodStr = batchContext ? `${batchContext.light_hours}/${batchContext.dark_hours}` : '18/6 (Default)';
  const stageStr = batchContext ? `${batchContext.stage.toUpperCase()} (Día ${batchContext.days_in_stage})` : 'Cultivo General';
  
  // Detección de estado de luces actual desde los eventos de Shelly en device_logs
  const latestLightEvent = deviceEvents.find(d => d.device_ip.includes('shelly') && (d.event === 'on' || d.event === 'off'));
  const isLightOnNow = latestLightEvent ? latestLightEvent.event === 'on' : true;
  
  let circadianHealth: 'sincronizado' | 'desfase_nocturno' | 'transicion_activa' = 'sincronizado';
  if (!isLightOnNow && latestBio.stress_index > 50 && latestBio.event === 'stress_spike') {
    circadianHealth = 'desfase_nocturno';
  }

  // 5. Evaluar Clima y VPD Foliar
  let transpirationStatus: 'optima' | 'exceso_vpd_cierre_estomatico' | 'humedad_excesiva' = 'optima';
  if (latestClimate) {
    if (latestClimate.vpd_leaf_kpa > 1.6) {
      transpirationStatus = 'exceso_vpd_cierre_estomatico';
    } else if (latestClimate.vpd_leaf_kpa < 0.6) {
      transpirationStatus = 'humedad_excesiva';
    }
  }

  // 6. Cross-Check con Análisis Visual de IA (core_image_analyses)
  let visualCorroboration = 'Sin análisis visual reciente.';
  if (latestImage) {
    visualCorroboration = `Score Visual: ${latestImage.health_score}/100. ${latestImage.issues_detected || 'Follaje sin anomalías visibles'}.`;
  }

  // 7. Diagnóstico Individual del Canal 1 (AD8232 #1 -> Pin A0)
  const ch1_v = latestBio.ch1?.voltage_mv ?? latestBio.voltage_mv;
  const ch1_b = latestBio.ch1?.baseline_mv ?? latestBio.baseline_mv;
  const ch1_d = Number((ch1_v - ch1_b).toFixed(2));
  const ch1_s = latestBio.ch1?.stress_index ?? latestBio.stress_index;
  const ch1_ev = latestBio.ch1?.event ?? latestBio.event;

  let ch1Assessment: ChannelAssessment = {
    channel_name: 'Canal 1 — Primario',
    channel_pin: 'AD8232 #1 (A0)',
    voltage_mv: ch1_v,
    baseline_mv: ch1_b,
    delta_mv: ch1_d,
    stress_index: ch1_s,
    event: ch1_ev,
    category: 'optimal',
    title: 'Metabolismo Basal y Fotosíntesis Fluida',
    description: `Biopotencial estable en ${ch1_v.toFixed(1)} mV con bajo índice de estrés (${ch1_s.toFixed(0)}%). Transporte iónico normal en el haz vascular primario.`,
    color: '#22c55e'
  };

  if (ch1_s > 65) {
    ch1Assessment = {
      ...ch1Assessment,
      category: 'warning',
      title: 'Alta Excitabilidad Bioeléctrica',
      description: `Oscilaciones rápidas detectadas en Canal 1 (${ch1_s.toFixed(0)}% estrés). Respondiendo a cambios microclimáticos o demanda de transpiración.`,
      color: '#f59e0b'
    };
  } else if (Math.abs(ch1_d) > 30 || ch1_ev === 'action_potential') {
    ch1Assessment = {
      ...ch1Assessment,
      category: 'info',
      title: 'Potencial de Acción Activo (CH1)',
      description: `Despolarización de membrana (+${ch1_d} mV). Transmisión de señales de influjo catiónico (K+/Ca2+) en curso.`,
      color: '#38bdf8'
    };
  }

  // 8. Diagnóstico Individual del Canal 2 (AD8232 #2 -> Pin A1)
  let ch2Assessment: ChannelAssessment | undefined = undefined;
  if (latestBio.ch2) {
    const ch2_v = latestBio.ch2.voltage_mv;
    const ch2_b = latestBio.ch2.baseline_mv;
    const ch2_d = Number((ch2_v - ch2_b).toFixed(2));
    const ch2_s = latestBio.ch2.stress_index;
    const ch2_ev = latestBio.ch2.event;

    ch2Assessment = {
      channel_name: 'Canal 2 — Secundario',
      channel_pin: 'AD8232 #2 (A1)',
      voltage_mv: ch2_v,
      baseline_mv: ch2_b,
      delta_mv: ch2_d,
      stress_index: ch2_s,
      event: ch2_ev,
      category: 'optimal',
      title: 'Homeostasis Tisular Secundaria',
      description: `Canal 2 en rango óptimo (${ch2_v.toFixed(1)} mV, ${ch2_s.toFixed(0)}% estrés). Conductividad de membrana en equilibrio.`,
      color: '#22c55e'
    };

    if (ch2_s > 65) {
      ch2Assessment = {
        ...ch2Assessment,
        category: 'warning',
        title: 'Excitación / Ajuste de Membrana (CH2)',
        description: `Variación acelerada en la segunda zona de monitoreo (${ch2_s.toFixed(0)}% estrés). Turgencia en adaptación continua.`,
        color: '#f59e0b'
      };
    } else if (Math.abs(ch2_d) > 30 || ch2_ev === 'action_potential') {
      ch2Assessment = {
        ...ch2Assessment,
        category: 'info',
        title: 'Potencial de Acción Local (CH2)',
        description: `Onda bioeléctrica secundaria activa (+${ch2_d} mV). Propagación sistémica en el tejido monitoreado.`,
        color: '#f59e0b'
      };
    }
  }

  // 9. Diagnóstico Diferencial e Inter-Canal (Gradiente y Translocación)
  let differentialAssessment: DifferentialAssessment | undefined = undefined;
  if (latestBio.ch2) {
    const gradient = Number((ch1_v - latestBio.ch2.voltage_mv).toFixed(1));
    const absGradient = Math.abs(gradient);

    if (gradient > 80) {
      differentialAssessment = {
        gradient_mv: gradient,
        direction: 'acropetalo',
        direction_label: 'Flujo Acropétalo (Base ➔ Ápice / Xilema)',
        propagation_status: 'Transporte Hidráulico y Catiónico Activo',
        systemic_title: `Gradiente Acropétalo Fuerte (+${gradient} mV)`,
        systemic_description: `El Canal 1 (${ch1_v.toFixed(1)} mV) supera al Canal 2 (${latestBio.ch2.voltage_mv.toFixed(1)} mV). Indica transporte ascendente vigoroso de savia bruta y nutrientes (K⁺, Ca²⁺, NO3⁻) desde la base hacia la zona superior.`,
        color: '#10b981'
      };
    } else if (gradient < -80) {
      differentialAssessment = {
        gradient_mv: gradient,
        direction: 'basipetalo',
        direction_label: 'Flujo Basipétalo (Ápice ➔ Raíz / Floema)',
        propagation_status: 'Translocación de Fotoasimilados',
        systemic_title: `Gradiente Basipétalo Descendente (${gradient} mV)`,
        systemic_description: `El Canal 2 (${latestBio.ch2.voltage_mv.toFixed(1)} mV) supera al Canal 1 (${ch1_v.toFixed(1)} mV). Indica translocación activa de azúcares y fotoasimilados desde hojas fuente hacia sumideros y raíces.`,
        color: '#f59e0b'
      };
    } else {
      differentialAssessment = {
        gradient_mv: gradient,
        direction: 'equilibrado',
        direction_label: 'Equilibrio Sistémico Transversal',
        propagation_status: 'Sincronía Tisular',
        systemic_title: `Potenciales en Sintonía (Δ: ${gradient > 0 ? '+' : ''}${gradient} mV)`,
        systemic_description: 'Ambos electrodos registran biopotenciales equilibrados a lo largo del eje vascular.',
        color: '#38bdf8'
      };
    }
  }

  // 10. Sintetizar Diagnóstico Integral del Individuo
  let stateAssessment: PhytoDiagnosisResult['state_assessment'] = {
    category: 'optimal',
    code: 'STEADY_OPTIMAL',
    title: 'Fotosíntesis y Metabolismo Óptimo',
    description: 'La planta presenta un potencial bioeléctrico equilibrado, buena conductividad de tallo y transpiración fluida sincronizada con el fotoperíodo.',
    color: '#22c55e'
  };

  if (circadianHealth === 'desfase_nocturno') {
    stateAssessment = {
      category: 'warning',
      code: 'LIGHT_POLLUTION_NIGHT_STRESS',
      title: 'Perturbación Bioeléctrica Nocturna',
      description: 'Picos de variación detectados durante la fase de oscuridad. Verifica posible contaminación lumínica en la carpa o estrés térmico nocturno.',
      color: '#f59e0b'
    };
  } else if (hydrationStatus === 'estres_hidrico_severo' || hydrationStatus === 'deficit_temprano') {
    stateAssessment = {
      category: hydrationStatus === 'estres_hidrico_severo' ? 'danger' : 'warning',
      code: 'WATER_STRESS',
      title: hydrationStatus === 'estres_hidrico_severo' ? 'Estrés Hídrico Crítico' : 'Alerta Temprana de Riego',
      description: `La humedad de la maceta centinela (${latestSoil?.moisture_pct || 0}%) está causando amortiguamiento bioeléctrico. Recomendado riego de hidratación.`,
      color: hydrationStatus === 'estres_hidrico_severo' ? '#ef4444' : '#f59e0b'
    };
  } else if (transpirationStatus === 'exceso_vpd_cierre_estomatico') {
    stateAssessment = {
      category: 'warning',
      code: 'VPD_STOMATAL_CLOSURE',
      title: 'Estrés por Exceso de VPD Foliar',
      description: `El VPD foliar (${latestClimate?.vpd_leaf_kpa} kPa) supera el límite de transpiración óptima (1.6 kPa), provocando fatiga estomática.`,
      color: '#eab308'
    };
  } else if (detectedNutriTrend === 'posible_deficit') {
    stateAssessment = {
      category: 'info',
      code: 'NUTRIENT_DEFICIENCY_EARLY',
      title: 'Demanda Nutricional Bioeléctrica',
      description: responseEvaluation,
      color: '#3b82f6'
    };
  } else if (ch1_ev === 'action_potential' || ch1_ev === 'stress_spike' || latestBio.ch2?.event === 'action_potential') {
    stateAssessment = {
      category: 'info',
      code: 'ACTION_POTENTIAL_METABOLIC',
      title: 'Potencial de Acción / Dinámica Activa',
      description: 'La planta está respondiendo a estímulos lumínicos o transporte catiónico en floema/xilema.',
      color: '#38bdf8'
    };
  }

  // 8. Seleccionar Protocolos de Cultivo Recomendados
  const recommendedProtocols: PhytoDiagnosisResult['recommended_protocols'] = [];
  
  if (stateAssessment.code === 'WATER_STRESS') {
    const p = protocols.find(pr => pr.title.toLowerCase().includes('riego') || (pr as any).topic?.toLowerCase().includes('riego'));
    if (p) recommendedProtocols.push({ id: p.id, title: p.title, relevance_reason: 'Protocolo de manejo de riego y recuperación hídrica.' });
  }
  if (detectedNutriTrend === 'posible_deficit') {
    const p = protocols.find(pr => pr.title.toLowerCase().includes('nutri') || (pr as any).topic?.toLowerCase().includes('nutri') || pr.stage?.toLowerCase() === batchContext?.stage.toLowerCase());
    if (p) recommendedProtocols.push({ id: p.id, title: p.title, relevance_reason: 'Protocolo nutricional recomendado para la fase actual.' });
  }
  if (stateAssessment.code === 'LIGHT_POLLUTION_NIGHT_STRESS') {
    const p = protocols.find(pr => pr.title.toLowerCase().includes('luz') || pr.title.toLowerCase().includes('foto'));
    if (p) recommendedProtocols.push({ id: p.id, title: p.title, relevance_reason: 'Protocolo de manejo de fotoperíodo y sellado lumínico.' });
  }

  // 9. Construir Serie Temporal Sincronizada para el Gráfico
  const chart_timeline: PhytoDiagnosisResult['chart_timeline'] = [];
  
  // Muestreo cronológico ordenado (de más antiguo a más reciente)
  const orderedBio = [...bioTelemetry].reverse();

  for (let i = 0; i < orderedBio.length; i++) {
    const item = orderedBio[i];
    const timeDate = new Date(item.timestamp);
    const timeLabel = `${timeDate.getHours().toString().padStart(2, '0')}:${timeDate.getMinutes().toString().padStart(2, '0')}`;

    // Buscar evento agronómico cercano (+/- 30 min)
    const matchingEvent = agronomicEvents.find(e => {
      const eTime = new Date(e.date_occurred).getTime();
      return Math.abs(eTime - timeDate.getTime()) <= 30 * 60 * 1000;
    });

    let event_label: string | undefined;
    let event_type: string | undefined;
    let nutrient_info: string | undefined;

    if (matchingEvent) {
      event_type = matchingEvent.event_type;
      event_label = matchingEvent.description || matchingEvent.event_type;
      if (matchingEvent.product_name) {
        const prof = resolveNutrientProfile(matchingEvent.product_name, matchingEvent.product_type);
        nutrient_info = prof ? `${prof.name} (${prof.primary_actives.slice(0, 2).join(', ')})` : matchingEvent.product_name;
      }
    }

    // Buscar mediciones de humedad temporalmente cercanas para Maceta 1 y Maceta 2
    const findClosestMoisture = (sList: SoilRecord[]) => {
      if (!sList || sList.length === 0) return undefined;
      let closest = sList[0];
      let minDiff = Math.abs(new Date(closest.created_at).getTime() - timeDate.getTime());
      for (let j = 0; j < Math.min(sList.length, 30); j++) {
        const diff = Math.abs(new Date(sList[j].created_at).getTime() - timeDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closest = sList[j];
        }
      }
      return closest.moisture_pct;
    };

    const ch1_soil = findClosestMoisture(sList1) ?? latestSoil1?.moisture_pct;
    const ch2_soil = findClosestMoisture(sList2) ?? latestSoil2?.moisture_pct;

    const ch1_v = item.ch1?.voltage_mv ?? item.voltage_mv;
    const ch1_b = item.ch1?.baseline_mv ?? item.baseline_mv;
    const ch2_v = item.ch2?.voltage_mv;
    const ch2_b = item.ch2?.baseline_mv;

    chart_timeline.push({
      time: item.timestamp,
      timeLabel,
      voltage_mv: ch1_v,
      baseline_mv: ch1_b,
      ch1_voltage_mv: ch1_v,
      ch1_baseline_mv: ch1_b,
      ch2_voltage_mv: ch2_v,
      ch2_baseline_mv: ch2_b,
      soil_moisture_pct: ch1_soil,
      ch1_soil_moisture_pct: ch1_soil,
      ch2_soil_moisture_pct: ch2_soil,
      vpd_leaf_kpa: latestClimate?.vpd_leaf_kpa,
      is_light_on: isLightOnNow,
      event_label,
      event_type,
      nutrient_info
    });
  }

  const latestCh1 = latestBio.ch1 || {
    voltage_mv: latestBio.voltage_mv,
    baseline_mv: latestBio.baseline_mv,
    stress_index: latestBio.stress_index,
    event: latestBio.event
  };

  const latestCh2 = latestBio.ch2;

  return {
    live_metrics: {
      voltage_mv: latestBio.voltage_mv,
      baseline_mv: latestBio.baseline_mv,
      delta_mv,
      stress_index: latestBio.stress_index,
      event: latestBio.event,
      ch1: {
        voltage_mv: latestCh1.voltage_mv,
        baseline_mv: latestCh1.baseline_mv,
        delta_mv: Number((latestCh1.voltage_mv - latestCh1.baseline_mv).toFixed(2)),
        stress_index: latestCh1.stress_index,
        event: latestCh1.event
      },
      ch2: latestCh2 ? {
        voltage_mv: latestCh2.voltage_mv,
        baseline_mv: latestCh2.baseline_mv,
        delta_mv: Number((latestCh2.voltage_mv - latestCh2.baseline_mv).toFixed(2)),
        stress_index: latestCh2.stress_index,
        event: latestCh2.event
      } : undefined,
      ads_online: latestBio.ads_online,
      timestamp: latestBio.timestamp
    },
    ch1_assessment: ch1Assessment,
    ch2_assessment: ch2Assessment,
    differential_assessment: differentialAssessment,
    state_assessment: stateAssessment,
    correlations: {
      hydration: {
        status: hydrationStatus,
        soil_moisture_pct: latestSoil1?.moisture_pct || null,
        ch1_soil_moisture_pct: latestSoil1?.moisture_pct || null,
        ch2_soil_moisture_pct: latestSoil2?.moisture_pct || null,
        ch1_status: h1.status,
        ch2_status: h2.status,
        absorption_efficiency: absorptionEfficiency
      },
      nutrition: {
        recent_product: recentNutriProduct,
        active_ingredients: activeIngredients,
        response_evaluation: responseEvaluation,
        detected_trend: detectedNutriTrend
      },
      circadian_and_lights: {
        photoperiod_applied: photoperiodStr,
        phase_days: stageStr,
        light_state_now: isLightOnNow ? 'Luz Encendida' : 'Fase Nocturna',
        circadian_health: circadianHealth
      },
      climate_vpd: {
        vpd_leaf: latestClimate?.vpd_leaf_kpa || null,
        vpd_ambient: latestClimate?.vpd_ambient_kpa || null,
        transpiration_status: transpirationStatus
      },
      visual_ai_crosscheck: {
        health_score: latestImage?.health_score || null,
        visual_issue: latestImage?.issues_detected || null,
        corroboration: visualCorroboration
      }
    },
    recommended_protocols: recommendedProtocols,
    chart_timeline
  };
}
