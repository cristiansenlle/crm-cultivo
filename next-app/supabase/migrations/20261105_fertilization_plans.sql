-- =================================================================================
-- MIGRACIÓN: PLANES DE FERTILIZACIÓN SEMANAL POR LOTE + FOTOPERIODOS >24H + VISIÓN IA
-- =================================================================================

-- 1. Crear tabla de Planes de Fertilización Maestros
CREATE TABLE IF NOT EXISTS public.core_fertilization_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  strain_target TEXT DEFAULT 'General',
  substrate_type TEXT DEFAULT 'Sustrato con Perlita',
  tank_Reference_liters NUMERIC DEFAULT 20,
  water_per_plant_liters NUMERIC DEFAULT 2.4,
  base_water_ec NUMERIC(6,2) DEFAULT 0.38,
  base_water_ppm NUMERIC(8,2) DEFAULT 181,
  tds_scale INTEGER DEFAULT 500,
  nutrition_strategy TEXT DEFAULT 'Feeding Powder + Top Crop',
  source_sheet_url TEXT DEFAULT NULL,
  weeks_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_protocols JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ampliar tabla core_batches para vincular un lote a su Plan de Fertilización y modo de sincronización (>24h)
ALTER TABLE public.core_batches
  ADD COLUMN IF NOT EXISTS fertilization_plan_id TEXT DEFAULT 'plan-red-hot-cookies-feeding',
  ADD COLUMN IF NOT EXISTS plan_week_offset INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_sync_mode TEXT DEFAULT 'biological_cycles';

-- 3. Ampliar core_agronomic_events con columnas opcionales de PPM
ALTER TABLE public.core_agronomic_events
  ADD COLUMN IF NOT EXISTS ppm_water NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ppm_runoff NUMERIC(8,2) DEFAULT NULL;

-- 4. Reclasificar Feeding Bio Enhancer como bioestimulador orgánico/biológico en gramos (Regla de Oro: no es sal mineral)
UPDATE public.core_inventory_quimicos
SET origin_type = 'organico', type = 'estimulador', dose_uom = 'g/L', recommended_dose = 0.5
WHERE LOWER(name) LIKE '%bio enhancer%' OR LOWER(name) LIKE '%bioenhancer%';
