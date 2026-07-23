-- ====================================================================
-- MIGRACIÓN DE BASE DE DATOS: TABLA DE ANÁLISIS DE IMÁGENES POR IA
-- ====================================================================

-- 1. Crear tabla para análisis de imágenes
CREATE TABLE IF NOT EXISTS core_image_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT REFERENCES core_batches(id) ON DELETE CASCADE,
    image_urls JSONB, -- Array de strings con las URLs de las imágenes
    context_snapshot JSONB, -- Contexto utilizado por la IA (clima, eventos, etc.)
    health_score NUMERIC CHECK (health_score >= 0 AND health_score <= 100),
    issues_detected JSONB, -- Array de strings con los problemas detectados
    recommendations TEXT,
    suggested_actions JSONB, -- Acciones sugeridas (Tareas/Eventos automáticos)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índice para optimizar consultas de búsquedas por lote
CREATE INDEX IF NOT EXISTS idx_image_analyses_batch ON core_image_analyses(batch_id);

-- 3. Habilitar seguridad de nivel de fila (RLS)
ALTER TABLE core_image_analyses ENABLE ROW LEVEL SECURITY;

-- 4. Crear política RLS para permitir acceso completo (público o anon)
-- Nota: Ajustar según las políticas de seguridad actuales de la aplicación.
CREATE POLICY "Permitir acceso total a core_image_analyses"
ON core_image_analyses FOR ALL
TO public
USING (true)
WITH CHECK (true);
