-- Script de Migración para Telemetría Distribuida y Multi-Sensor
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)

BEGIN;

-- 1. Crear tabla de sensores
CREATE TABLE IF NOT EXISTS public.core_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.core_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Modificar la tabla de telemetria
ALTER TABLE public.daily_telemetry 
ADD COLUMN IF NOT EXISTS sensor_id UUID REFERENCES public.core_sensors(id) ON DELETE SET NULL;

-- 3. Crear un sensor "Sensor por defecto 1" por cada sala existente
INSERT INTO public.core_sensors (room_id, name)
SELECT id, 'Sensor por defecto 1' FROM public.core_rooms
WHERE id NOT IN (SELECT room_id FROM public.core_sensors WHERE name = 'Sensor por defecto 1');

-- 4. Asociar el historial de telemetría sin sensor a su sensor por defecto
UPDATE public.daily_telemetry dt
SET sensor_id = cs.id
FROM public.core_sensors cs
WHERE dt.room_id = cs.room_id AND dt.sensor_id IS NULL;

COMMIT;
