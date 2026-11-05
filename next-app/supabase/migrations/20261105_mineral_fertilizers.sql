-- =================================================================================
-- MIGRACIÓN: SOPORTE PARA FERTILIZANTES MINERALES (g/L), DILUCIÓN EN AGUA, pH Y EC
-- =================================================================================

-- 1. Ampliar tabla de inventario químico (core_inventory_quimicos)
ALTER TABLE public.core_inventory_quimicos
  ADD COLUMN IF NOT EXISTS origin_type TEXT DEFAULT 'organico',
  ADD COLUMN IF NOT EXISTS recommended_dose NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dose_uom TEXT DEFAULT 'ml/L';

-- Clasificar insumos existentes según su tipo actual
UPDATE public.core_inventory_quimicos
SET
  origin_type = CASE
    WHEN type = 'fertilizante_mineral' THEN 'mineral'
    WHEN type IN ('pesticida_biologico', 'fungicida') THEN 'biologico'
    WHEN type = 'corrector_ph' THEN 'corrector_ph'
    ELSE 'organico'
  END,
  dose_uom = CASE
    WHEN uom IN ('gr', 'Kg') THEN 'g/L'
    ELSE 'ml/L'
  END
WHERE origin_type IS NULL OR origin_type = 'organico';

-- 2. Ampliar tabla de eventos agronómicos (core_agronomic_events)
ALTER TABLE public.core_agronomic_events
  ADD COLUMN IF NOT EXISTS dosage_per_liter NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dosage_uom TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ph_water NUMERIC(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ec_water NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ec_unit TEXT DEFAULT 'mS/cm',
  ADD COLUMN IF NOT EXISTS ec_water_base NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ph_runoff NUMERIC(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ec_runoff NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recipe_items JSONB DEFAULT NULL;

-- 3. Índices de consulta rápida por lote y fecha
CREATE INDEX IF NOT EXISTS idx_agronomic_events_batch_date
  ON public.core_agronomic_events (batch_id, date_occurred DESC);
