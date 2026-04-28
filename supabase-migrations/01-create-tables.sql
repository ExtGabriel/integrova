-- ============================================
-- CFE INSIGHT - MIGRACIÓN CRÍTICA
-- Crear tablas entities y commitments
-- ============================================
-- EJECUTAR ESTE SCRIPT MANUALMENTE EN SUPABASE DASHBOARD
-- Dashboard > SQL Editor > New Query > Pegar > Run

-- ============================================
-- 1. TABLA: entities
-- ============================================
CREATE TABLE IF NOT EXISTS public.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    responsible TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entities_name ON public.entities(name);

-- ============================================
-- 2. TABLA: commitments
-- ============================================
CREATE TABLE IF NOT EXISTS public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    entity TEXT,
    status TEXT DEFAULT 'pendiente',
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_commitments_status ON public.commitments(status);
CREATE INDEX IF NOT EXISTS idx_commitments_deadline ON public.commitments(deadline);

-- ============================================
-- 3. RLS (Row Level Security)
-- ============================================
-- Activar RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS DE ACCESO MÍNIMAS
-- ============================================

-- Entities: SELECT para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_select_entities" ON public.entities;
CREATE POLICY "allow_authenticated_select_entities"
ON public.entities
FOR SELECT
TO authenticated
USING (true);

-- Entities: INSERT para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_insert_entities" ON public.entities;
CREATE POLICY "allow_authenticated_insert_entities"
ON public.entities
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Entities: UPDATE para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_update_entities" ON public.entities;
CREATE POLICY "allow_authenticated_update_entities"
ON public.entities
FOR UPDATE
TO authenticated
USING (true);

-- Entities: DELETE para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_delete_entities" ON public.entities;
CREATE POLICY "allow_authenticated_delete_entities"
ON public.entities
FOR DELETE
TO authenticated
USING (true);

-- Commitments: SELECT para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_select_commitments" ON public.commitments;
CREATE POLICY "allow_authenticated_select_commitments"
ON public.commitments
FOR SELECT
TO authenticated
USING (true);

-- Commitments: INSERT para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_insert_commitments" ON public.commitments;
CREATE POLICY "allow_authenticated_insert_commitments"
ON public.commitments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Commitments: UPDATE para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_update_commitments" ON public.commitments;
CREATE POLICY "allow_authenticated_update_commitments"
ON public.commitments
FOR UPDATE
TO authenticated
USING (true);

-- Commitments: DELETE para usuarios autenticados
DROP POLICY IF EXISTS "allow_authenticated_delete_commitments" ON public.commitments;
CREATE POLICY "allow_authenticated_delete_commitments"
ON public.commitments
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================
-- Después de ejecutar, verifica con:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM public.entities LIMIT 1;
-- SELECT * FROM public.commitments LIMIT 1;

-- ============================================
-- 6. DATOS DE PRUEBA (OPCIONAL)
-- ============================================
-- Descomentar si quieres datos de ejemplo
/*
INSERT INTO public.entities (name, responsible) VALUES 
('Entidad de Prueba 1', 'Juan Pérez'),
('Entidad de Prueba 2', 'María García');

INSERT INTO public.commitments (description, entity, status, deadline) VALUES 
('Compromiso de prueba 1', 'Entidad de Prueba 1', 'pendiente', now() + interval '7 days'),
('Compromiso de prueba 2', 'Entidad de Prueba 2', 'en proceso', now() + interval '14 days');
*/
