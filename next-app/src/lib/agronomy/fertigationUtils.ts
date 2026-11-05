/**
 * Utilidades para Carga, Dilución (g/L o ml/L), Control de pH / EC
 * y Compatibilidad Retroactiva con Supabase para Fertilizantes Minerales y Orgánicos.
 */

export type InsumoOriginType = 'organico' | 'mineral' | 'biologico' | 'corrector_ph' | 'otro';

export interface RecipeItemApplied {
  product_name: string;
  product_id?: string | null;
  origin_type?: InsumoOriginType;
  uom: string; // 'gr' | 'Kg' | 'ml' | 'L' | 'unidades'
  dose_per_liter: number; // ej. 1.5 (g/L o ml/L)
  dose_uom: string; // 'g/L' | 'ml/L'
  amount_applied: number; // total gramos o ml extraídos de bodega
  cost: number; // costo total de este ítem
  consumed_batches?: Array<{ id: string; qty: number }>; // para revertir stock exacto al editar/borrar
}

export interface FertigationMetrics {
  water_liters: number | null;
  dosage_per_liter: number | null;
  dosage_uom: string | null;
  ph_water: number | null;
  ec_water: number | null;
  ec_unit: 'mS/cm' | 'µS/cm' | 'ppm';
  ppm_water: number | null;
  ec_water_base: number | null;
  ph_runoff: number | null;
  ec_runoff: number | null;
  ppm_runoff: number | null;
  recipe_items: RecipeItemApplied[];
  raw_notes: string;
  is_mineral: boolean;
}

/**
 * Determina el origen/naturaleza de un insumo de bodega (Mineral vs Orgánico)
 */
export function getInsumoOrigin(item: any): InsumoOriginType {
  if (!item) return 'organico';
  if (item.origin_type) return item.origin_type as InsumoOriginType;

  const t = (item.type || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (t === 'fertilizante_mineral' || t.includes('mineral') || t.includes('sales')) {
    return 'mineral';
  }
  if (t === 'corrector_ph' || name.includes('ph ') || name.includes('ph-') || name.includes('ph+')) {
    return 'corrector_ph';
  }
  if (t === 'pesticida_biologico' || t === 'fungicida' || name.includes('bacillus') || name.includes('trichoderma')) {
    return 'biologico';
  }
  if (t === 'pesticida' || t === 'sustrato' || t === 'miscelaneo') {
    return 'otro';
  }
  return 'organico';
}

/**
 * Devuelve la unidad de dosis por litro correspondiente según la UoM de bodega
 */
export function getDoseUomForInsumo(uom?: string): 'g/L' | 'ml/L' | 'u/L' {
  const clean = (uom || 'ml').toLowerCase().trim();
  if (clean === 'gr' || clean === 'g' || clean === 'kg') return 'g/L';
  if (clean === 'ml' || clean === 'l') return 'ml/L';
  return 'u/L';
}

/**
 * Convierte la cantidad total en la unidad de bodega cuando se multiplica (Litros de Agua * Dosis por Litro).
 * Ej: Si la dosis es 1.5 g/L y el agua es 10 L -> 15 gramos.
 * Si el insumo en bodega está en 'Kg', 15 gramos equivalen a 0.015 Kg.
 * Si el insumo en bodega está en 'gr', 15 gramos equivalen a 15 gr.
 */
export function calcTotalStockFromDose(waterLiters: number, dosePerLiter: number, stockUom?: string): number {
  if (!waterLiters || waterLiters <= 0 || !dosePerLiter || dosePerLiter <= 0) return 0;
  const rawTotal = waterLiters * dosePerLiter; // en gramos o mililitros
  const uom = (stockUom || 'gr').toLowerCase().trim();
  if (uom === 'kg' || uom === 'l') {
    return Number((rawTotal / 1000).toFixed(4));
  }
  return Number(rawTotal.toFixed(2));
}

/**
 * Calcula la dosis en g/L o ml/L a partir del total extraído de bodega y los litros de agua.
 */
export function calcDoseFromTotalStock(waterLiters: number, totalStockApplied: number, stockUom?: string): number {
  if (!waterLiters || waterLiters <= 0 || !totalStockApplied || totalStockApplied <= 0) return 0;
  const uom = (stockUom || 'gr').toLowerCase().trim();
  const baseAmount = (uom === 'kg' || uom === 'l') ? totalStockApplied * 1000 : totalStockApplied;
  return Number((baseAmount / waterLiters).toFixed(2));
}

/**
 * Construye una descripción legible y estructurada que conserva todos los metadatos
 * fisicoquímicos incluso si la tabla de Supabase aún no tiene las columnas nuevas.
 */
export function buildFertigationDescription(params: {
  actionType: 'riego' | 'ipm';
  waterLiters?: number | null;
  phWater?: number | null;
  ecWater?: number | null;
  ecUnit?: string;
  ppmWater?: number | null;
  ecWaterBase?: number | null;
  phRunoff?: number | null;
  ecRunoff?: number | null;
  ppmRunoff?: number | null;
  recipeItems: RecipeItemApplied[];
  notes?: string;
  perBatchSuffix?: boolean;
}): string {
  const {
    actionType,
    waterLiters,
    phWater,
    ecWater,
    ecUnit = 'mS/cm',
    ppmWater,
    ecWaterBase,
    phRunoff,
    ecRunoff,
    ppmRunoff,
    recipeItems,
    notes = '',
    perBatchSuffix = false
  } = params;

  const hasMineral = recipeItems.some(i => i.origin_type === 'mineral');
  const headerPrefix = actionType === 'ipm'
    ? 'IPM'
    : hasMineral
    ? 'RIEGO MINERAL'
    : 'RIEGO';

  let productSummary = '';
  if (recipeItems.length === 0) {
    productSummary = actionType === 'riego' ? 'Sólo Agua / Preventivo Manual' : 'Acción Manual (sin insumo)';
  } else {
    const parts = recipeItems.map(item => {
      const dosePart = item.dose_per_liter && item.dose_per_liter > 0
        ? `${item.dose_per_liter} ${item.dose_uom} → `
        : '';
      const suffix = perBatchSuffix ? ' por lote' : '';
      return `${item.product_name} (${dosePart}${item.amount_applied} ${item.uom}${suffix})`;
    });
    productSummary = `${headerPrefix}: ${parts.join(' + ')}`;
  }

  // Bloque técnico entre corchetes para lectura rápida y parseo determinístico
  const techTags: string[] = [];
  if (waterLiters && waterLiters > 0) techTags.push(`Agua: ${waterLiters}L`);
  if (phWater !== null && phWater !== undefined && !isNaN(Number(phWater))) techTags.push(`pH: ${phWater}`);
  if (ecWater !== null && ecWater !== undefined && !isNaN(Number(ecWater))) techTags.push(`EC: ${ecWater} ${ecUnit}`);
  if (ppmWater !== null && ppmWater !== undefined && !isNaN(Number(ppmWater))) techTags.push(`PPM: ${ppmWater} ppm`);
  if (ecWaterBase !== null && ecWaterBase !== undefined && !isNaN(Number(ecWaterBase))) techTags.push(`EC Base: ${ecWaterBase}`);
  if (
    (phRunoff !== null && phRunoff !== undefined && !isNaN(Number(phRunoff))) ||
    (ecRunoff !== null && ecRunoff !== undefined && !isNaN(Number(ecRunoff))) ||
    (ppmRunoff !== null && ppmRunoff !== undefined && !isNaN(Number(ppmRunoff)))
  ) {
    const rParts: string[] = [];
    if (phRunoff !== null && phRunoff !== undefined && !isNaN(Number(phRunoff))) rParts.push(`pH ${phRunoff}`);
    if (ecRunoff !== null && ecRunoff !== undefined && !isNaN(Number(ecRunoff))) rParts.push(`EC ${ecRunoff}`);
    if (ppmRunoff !== null && ppmRunoff !== undefined && !isNaN(Number(ppmRunoff))) rParts.push(`PPM ${ppmRunoff}`);
    techTags.push(`Drenaje: ${rParts.join(' / ')}`);
  }

  const techBlock = techTags.length > 0 ? ` [${techTags.join(' | ')}]` : '';
  const cleanNotes = notes.trim();

  return `${productSummary}${techBlock}. ${cleanNotes}`.trim();
}

/**
 * Extrae todas las métricas de fertirriego desde un registro de `core_agronomic_events`,
 * leyendo primero las columnas nativas de BD y haciendo fallback al bloque técnico en `description`.
 */
export function parseEventFertigationMetrics(ev: any): FertigationMetrics {
  const desc: string = ev?.description || '';

  let water_liters: number | null = ev?.water_liters && Number(ev.water_liters) > 0 ? Number(ev.water_liters) : null;
  let dosage_per_liter: number | null = ev?.dosage_per_liter !== undefined && ev?.dosage_per_liter !== null ? Number(ev.dosage_per_liter) : null;
  let dosage_uom: string | null = ev?.dosage_uom || null;
  let ph_water: number | null = ev?.ph_water !== undefined && ev?.ph_water !== null ? Number(ev.ph_water) : null;
  let ec_water: number | null = ev?.ec_water !== undefined && ev?.ec_water !== null ? Number(ev.ec_water) : null;
  let ec_unit: 'mS/cm' | 'µS/cm' | 'ppm' = (ev?.ec_unit as any) || 'mS/cm';
  let ppm_water: number | null = ev?.ppm_water !== undefined && ev?.ppm_water !== null ? Number(ev.ppm_water) : null;
  let ec_water_base: number | null = ev?.ec_water_base !== undefined && ev?.ec_water_base !== null ? Number(ev.ec_water_base) : null;
  let ph_runoff: number | null = ev?.ph_runoff !== undefined && ev?.ph_runoff !== null ? Number(ev.ph_runoff) : null;
  let ec_runoff: number | null = ev?.ec_runoff !== undefined && ev?.ec_runoff !== null ? Number(ev.ec_runoff) : null;
  let ppm_runoff: number | null = ev?.ppm_runoff !== undefined && ev?.ppm_runoff !== null ? Number(ev.ppm_runoff) : null;
  let recipe_items: RecipeItemApplied[] = Array.isArray(ev?.recipe_items) ? ev.recipe_items : [];

  // Fallback desde bloque técnico [...] en description
  const bracketMatch = desc.match(/\[(.*?)\]/);
  if (bracketMatch && bracketMatch[1]) {
    const content = bracketMatch[1];
    if (water_liters === null) {
      const mWater = content.match(/Agua:\s*([0-9.]+)\s*L/i);
      if (mWater) water_liters = parseFloat(mWater[1]);
    }
    if (ph_water === null) {
      const mPh = content.match(/(?:^|\|\s*)pH:\s*([0-9.]+)/i);
      if (mPh) ph_water = parseFloat(mPh[1]);
    }
    if (ec_water === null) {
      const mEc = content.match(/(?:^|\|\s*)EC:\s*([0-9.]+)\s*(mS\/cm|µS\/cm|uS\/cm|ppm)?/i);
      if (mEc) {
        ec_water = parseFloat(mEc[1]);
        if (mEc[2]) {
          ec_unit = mEc[2] === 'uS/cm' ? 'µS/cm' : (mEc[2] as any);
        }
      }
    }
    if (ppm_water === null) {
      const mPpm = content.match(/(?:^|\|\s*)PPM:\s*([0-9.]+)/i);
      if (mPpm) ppm_water = parseFloat(mPpm[1]);
    }
    if (ec_water_base === null) {
      const mEcBase = content.match(/EC Base:\s*([0-9.]+)/i);
      if (mEcBase) ec_water_base = parseFloat(mEcBase[1]);
    }
    if (ph_runoff === null || ec_runoff === null || ppm_runoff === null) {
      const mRunoff = content.match(/Drenaje:\s*([^\]]+)/i);
      if (mRunoff) {
        const rStr = mRunoff[1];
        const mRPh = rStr.match(/pH\s*([0-9.]+)/i);
        const mREc = rStr.match(/EC\s*([0-9.]+)/i);
        const mRPpm = rStr.match(/PPM\s*([0-9.]+)/i);
        if (ph_runoff === null && mRPh) ph_runoff = parseFloat(mRPh[1]);
        if (ec_runoff === null && mREc) ec_runoff = parseFloat(mREc[1]);
        if (ppm_runoff === null && mRPpm) ppm_runoff = parseFloat(mRPpm[1]);
      }
    }
  }

  // Fallback para extraer productos y dosis (ej. "Nombre (1.5 g/L → 15 gr)" o "Nombre (15 ml)")
  if (recipe_items.length === 0 && desc) {
    const headerRemoved = desc.replace(/^(?:RIEGO MINERAL|RIEGO|IPM|Nutrici[oó]n):\s*/i, '');
    const beforeBracket = headerRemoved.split('[')[0].split(').')[0];
    const itemRegex = /([^+(]+?)\s*\(\s*(?:([0-9.]+)\s*(g\/L|ml\/L|u\/L)\s*→\s*)?([0-9.]+)\s*(gr|g|Kg|ml|L|unidades)(?:\s*por lote)?\s*\)/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(beforeBracket)) !== null) {
      const pName = match[1].trim().replace(/^\+\s*/, '');
      const dVal = match[2] ? parseFloat(match[2]) : 0;
      const dUom = match[3] || getDoseUomForInsumo(match[5]);
      const amtVal = parseFloat(match[4]);
      const uomVal = match[5];

      const computedDose = dVal > 0
        ? dVal
        : (water_liters && water_liters > 0 ? calcDoseFromTotalStock(water_liters, amtVal, uomVal) : 0);

      recipe_items.push({
        product_name: pName,
        uom: uomVal,
        dose_per_liter: computedDose,
        dose_uom: dUom,
        amount_applied: amtVal,
        cost: 0
      });
    }

    if (dosage_per_liter === null && recipe_items.length > 0 && recipe_items[0].dose_per_liter > 0) {
      dosage_per_liter = recipe_items[0].dose_per_liter;
      dosage_uom = recipe_items[0].dose_uom;
    }
  }

  // Extraer notas limpias del usuario (después del primer ". ")
  let raw_notes = desc;
  const dotIdx = desc.indexOf('. ');
  if (dotIdx !== -1) {
    const prefix = desc.slice(0, dotIdx);
    if (
      prefix.includes(':') ||
      prefix.includes('[') ||
      prefix.includes('Sólo Agua') ||
      prefix.includes('Acción Manual') ||
      prefix.includes('PODA') ||
      prefix.includes('COSECHA')
    ) {
      raw_notes = desc.slice(dotIdx + 2);
    }
  } else if (
    desc.startsWith('RIEGO') ||
    desc.startsWith('IPM') ||
    desc.startsWith('Sólo Agua') ||
    desc.startsWith('Acción Manual')
  ) {
    raw_notes = '';
  }

  const is_mineral =
    desc.toUpperCase().startsWith('RIEGO MINERAL') ||
    dosage_uom === 'g/L' ||
    recipe_items.some(i => i.origin_type === 'mineral' || i.dose_uom === 'g/L' || i.uom === 'gr' || i.uom === 'Kg') ||
    ph_water !== null ||
    ec_water !== null;

  return {
    water_liters,
    dosage_per_liter,
    dosage_uom,
    ph_water,
    ec_water,
    ec_unit,
    ppm_water,
    ec_water_base,
    ph_runoff,
    ec_runoff,
    ppm_runoff,
    recipe_items,
    raw_notes,
    is_mineral
  };
}

/**
 * Inserta o actualiza registros en `core_agronomic_events` intentando usar las columnas
 * extendidas de nutrición mineral, y haciendo fallback automático a las columnas base
 * si la migración SQL aún no fue corrida en el servidor Supabase.
 */
const BASE_EVENT_COLUMNS = [
  'id',
  'batch_id',
  'room_id',
  'event_type',
  'description',
  'date_occurred',
  'water_liters',
  'total_cost',
  'product_id',
  'amount_applied',
  'status'
];

export function stripExtendedEventColumns(row: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const key of BASE_EVENT_COLUMNS) {
    if (row[key] !== undefined) {
      clean[key] = row[key];
    }
  }
  return clean;
}

export async function insertAgronomicEventsSafe(supabase: any, rows: Record<string, any>[]) {
  const { data, error } = await supabase.from('core_agronomic_events').insert(rows);
  if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
    const fallbackRows = rows.map(stripExtendedEventColumns);
    return await supabase.from('core_agronomic_events').insert(fallbackRows);
  }
  return { data, error };
}

export async function updateAgronomicEventSafe(supabase: any, id: string, payload: Record<string, any>) {
  const { data, error } = await supabase.from('core_agronomic_events').update(payload).eq('id', id);
  if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
    const fallbackPayload = stripExtendedEventColumns(payload);
    return await supabase.from('core_agronomic_events').update(fallbackPayload).eq('id', id);
  }
  return { data, error };
}

const BASE_INSUMO_COLUMNS = [
  'id',
  'name',
  'type',
  'qty',
  'min_stock',
  'last_updated',
  'unit_cost',
  'uom'
];

export function stripExtendedInsumoColumns(row: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const key of BASE_INSUMO_COLUMNS) {
    if (row[key] !== undefined) {
      clean[key] = row[key];
    }
  }
  return clean;
}

export async function insertInsumoSafe(supabase: any, payload: Record<string, any>) {
  const { data, error } = await supabase.from('core_inventory_quimicos').insert([payload]);
  if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
    const fallback = stripExtendedInsumoColumns(payload);
    return await supabase.from('core_inventory_quimicos').insert([fallback]);
  }
  return { data, error };
}

export async function updateInsumoSafe(supabase: any, ids: string[], payload: Record<string, any>) {
  const { data, error } = await supabase.from('core_inventory_quimicos').update(payload).in('id', ids);
  if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
    const fallback = stripExtendedInsumoColumns(payload);
    return await supabase.from('core_inventory_quimicos').update(fallback).in('id', ids);
  }
  return { data, error };
}
