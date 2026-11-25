-- =================================================================================
-- MIGRACIÓN: MOTOR DE AUTOMATIZACIÓN CLIMÁTICA VINCULADO A CONSIGNAS (DÍA/NOCHE)
-- Soporta prioridades, condiciones combinadas (AND), histéresis y equipos 3-en-1
-- =================================================================================

ALTER TABLE public.climate_automation_rules
  ADD COLUMN IF NOT EXISTS threshold_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS secondary_parameter TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secondary_condition TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secondary_threshold_source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS secondary_threshold_value NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'auto';

CREATE INDEX IF NOT EXISTS idx_climate_automation_rules_active_priority
  ON public.climate_automation_rules (priority ASC, created_at ASC)
  WHERE is_active = true;
