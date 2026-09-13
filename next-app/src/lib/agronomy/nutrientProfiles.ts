/**
 * Diccionario de Principios Activos y Perfiles Bioeléctricos
 * Mapeo inteligente de insumos de bodega (core_inventory_quimicos)
 * a vectores de nutrientes y respuesta electrofisiológica esperada.
 */

export interface NutrientProfile {
  id_aliases: string[];
  name: string;
  category: 'vegetativo' | 'floracion' | 'microelementos' | 'estructural_silicio' | 'enraizador_enzimas' | 'fitosanitario_ipm';
  primary_actives: string[]; // e.g. ['Nitrógeno Asimilable', 'Aminoácidos']
  npk_ratio?: string; // e.g. '9-4-8'
  ionic_charge: 'cationic' | 'anionic' | 'balanced' | 'neutral';
  bioelectric_signature: {
    expected_response: 'depolarization' | 'hyperpolarization' | 'membrane_resistance_increase' | 'h_atpase_stimulation' | 'vp_suppression';
    expected_delta_mv: [number, number]; // [min, max] delta mV esperado
    onset_window_hours: [number, number]; // ventana de tiempo en horas tras el riego
    physiological_meaning: string;
  };
  deficiency_indicator: {
    symptom_signal: 'chronic_depolarization' | 'loss_of_membrane_potential' | 'amplitude_dampening' | 'erratic_spikes';
    deficiency_name: string;
    warning_text: string;
  };
}

export const KNOWN_NUTRIENT_PROFILES: Record<string, NutrientProfile> = {
  top_veg: {
    id_aliases: ['top veg', 'green explosion'],
    name: 'Top Veg / Estimulador Vegetativo',
    category: 'vegetativo',
    primary_actives: ['Nitrógeno Orgánico (N)', 'Ácidos Húmicos', 'Aminoácidos'],
    npk_ratio: '9-4-8',
    ionic_charge: 'cationic',
    bioelectric_signature: {
      expected_response: 'depolarization',
      expected_delta_mv: [25, 65],
      onset_window_hours: [3, 14],
      physiological_meaning: 'Despolarización saludable por influjo catiónico y asimilación activa de Nitrógeno en xilema/floema.'
    },
    deficiency_indicator: {
      symptom_signal: 'chronic_depolarization',
      deficiency_name: 'Deficiencia de Nitrógeno (N)',
      warning_text: 'Despolarización basal anómala sin fertilización reciente. Alerta preventiva de déficit de N antes de síntomas de clorosis foliar.'
    }
  },
  calmag: {
    id_aliases: ['calmag', 'cal mag', 'calcio magnesio'],
    name: 'CalMag Suplemento',
    category: 'microelementos',
    primary_actives: ['Calcio Divalente (Ca²⁺)', 'Magnesio (Mg²⁺)', 'Nitrógeno Nítrico'],
    ionic_charge: 'cationic',
    bioelectric_signature: {
      expected_response: 'hyperpolarization',
      expected_delta_mv: [-40, -15],
      onset_window_hours: [2, 10],
      physiological_meaning: 'Estabilización y repolarización de membrana: el Calcio sella canales de fuga iónica y fortalece la turgencia celular.'
    },
    deficiency_indicator: {
      symptom_signal: 'loss_of_membrane_potential',
      deficiency_name: 'Deficiencia de Calcio / Magnesio (Ca/Mg)',
      warning_text: 'Caída de potencial basal persistente. Alerta de déficit de Calcio detectable en < 24h (vs 9 días para síntomas visuales).'
    }
  },
  barrier: {
    id_aliases: ['barrier', 'silicio', 'silicato'],
    name: 'Barrier / Silicato de Potasio',
    category: 'estructural_silicio',
    primary_actives: ['Silicio Asimilable (Si)', 'Potasio (K⁺)'],
    npk_ratio: '0-0-4',
    ionic_charge: 'balanced',
    bioelectric_signature: {
      expected_response: 'membrane_resistance_increase',
      expected_delta_mv: [10, 30],
      onset_window_hours: [4, 18],
      physiological_meaning: 'Aumento de la impedancia bioeléctrica y resistencia celular por deposición de sílice en paredes celulares.'
    },
    deficiency_indicator: {
      symptom_signal: 'amplitude_dampening',
      deficiency_name: 'Fragilidad Celular / Estrés Térmico',
      warning_text: 'Baja reactividad de membrana ante saltos térmicos. Recomendada aplicación de Silicio para protección celular.'
    }
  },
  myr_clorosis: {
    id_aliases: ['myr clorosis', 'hierro', 'fe', 'micronutrientes'],
    name: 'Myr Clorosis / Complejo Micronutrientes',
    category: 'microelementos',
    primary_actives: ['Hierro Quelatado (Fe)', 'Manganeso (Mn)', 'Zinc (Zn)', 'Magnesio (Mg)'],
    ionic_charge: 'cationic',
    bioelectric_signature: {
      expected_response: 'h_atpase_stimulation',
      expected_delta_mv: [15, 35],
      onset_window_hours: [3, 12],
      physiological_meaning: 'Reactivación de la cadena de transporte electrónico fotosintético y transporte de clorofila.'
    },
    deficiency_indicator: {
      symptom_signal: 'loss_of_membrane_potential',
      deficiency_name: 'Clorosis / Déficit de Hierro o Manganeso',
      warning_text: 'Hiperpolarización basal profunda. Detectada carencia de micronutrientes en fotosistemas I y II.'
    }
  },
  top_bloom: {
    id_aliases: ['top bloom', 'top bud', 'big one', 'top candy', 'vamp pocion impkble'],
    name: 'Nutrición y Estimulación de Floración',
    category: 'floracion',
    primary_actives: ['Fósforo (P)', 'Potasio (K⁺)', 'Bioestimulantes de Resina', 'Carbohidratos'],
    npk_ratio: '4-8-8 / PK',
    ionic_charge: 'balanced',
    bioelectric_signature: {
      expected_response: 'h_atpase_stimulation',
      expected_delta_mv: [20, 50],
      onset_window_hours: [3, 16],
      physiological_meaning: 'Estimulación de la bomba de protones H⁺-ATPasa para carga de asimilados y azúcares hacia cálices y tricomas.'
    },
    deficiency_indicator: {
      symptom_signal: 'amplitude_dampening',
      deficiency_name: 'Déficit de Fósforo / Potasio en Floración',
      warning_text: 'Declive prematuro de la conductividad bioeléctrica reproductiva antes de la fase de senescencia.'
    }
  },
  fitosanitarios: {
    id_aliases: ['escudo', 'biotrap bacillus', 'jabón potásico', 'neem'],
    name: 'Fitosanitario / Control Biológico IPM',
    category: 'fitosanitario_ipm',
    primary_actives: ['Bacillus subtilis', 'Jabón Potásico', 'Extractos Botánicos Protectores'],
    ionic_charge: 'neutral',
    bioelectric_signature: {
      expected_response: 'vp_suppression',
      expected_delta_mv: [-15, 15],
      onset_window_hours: [1, 24],
      physiological_meaning: 'Cese y supresión de ráfagas de Potenciales de Variación (VP) tras control efectivo de plagas o patógenos.'
    },
    deficiency_indicator: {
      symptom_signal: 'erratic_spikes',
      deficiency_name: 'Ataque de Plagas / Herbivoría Activa',
      warning_text: 'Ráfagas de picos de variación (VP: -11 a -129 mV). Alerta de araña roja, trips o ácaros picadores.'
    }
  }
};

/**
 * Resuelve el perfil nutricional y bioeléctrico a partir del nombre o tipo de producto en bodega
 */
export function resolveNutrientProfile(productName: string, productType?: string): NutrientProfile | null {
  if (!productName) return null;
  const cleanName = productName.toLowerCase().trim();

  for (const [key, profile] of Object.entries(KNOWN_NUTRIENT_PROFILES)) {
    if (profile.id_aliases.some(alias => cleanName.includes(alias))) {
      return profile;
    }
  }

  // Fallback por tipo de producto en bodega
  if (productType === 'fungicida' || productType === 'pesticida_biologico') {
    return KNOWN_NUTRIENT_PROFILES.fitosanitarios;
  }
  if (cleanName.includes('veg') || cleanName.includes('grow')) {
    return KNOWN_NUTRIENT_PROFILES.top_veg;
  }
  if (cleanName.includes('bloom') || cleanName.includes('flor') || cleanName.includes('bud')) {
    return KNOWN_NUTRIENT_PROFILES.top_bloom;
  }

  return null;
}
