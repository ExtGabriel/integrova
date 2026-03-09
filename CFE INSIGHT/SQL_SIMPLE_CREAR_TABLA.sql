-- =====================================================
-- CREAR TABLA audit_documents (VERSIÓN SIMPLIFICADA)
-- CFE INSIGHT - Sistema de Documentos de Auditoría
-- =====================================================
-- INSTRUCCIONES:
-- 1. Copia TODO este archivo (Ctrl+A, Ctrl+C)
-- 2. Ve a: https://supabase.com/dashboard
-- 3. Abre SQL Editor → New Query
-- 4. Pega el código (Ctrl+V)
-- 5. Haz clic en "Run" (Ctrl+Enter)
-- =====================================================

-- Crear tabla audit_documents
CREATE TABLE IF NOT EXISTS public.audit_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID,
    commitment_id INTEGER NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'planes_procedimientos',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_documents_form_id ON public.audit_documents(form_id);
CREATE INDEX IF NOT EXISTS idx_audit_documents_commitment_id ON public.audit_documents(commitment_id);
CREATE INDEX IF NOT EXISTS idx_audit_documents_uploaded_by ON public.audit_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_audit_documents_category ON public.audit_documents(category);
CREATE INDEX IF NOT EXISTS idx_audit_documents_created_at ON public.audit_documents(created_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.audit_documents ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer documentos
CREATE POLICY IF NOT EXISTS "Todos pueden leer documentos"
ON public.audit_documents FOR SELECT
USING (true);

-- Política: Usuarios autenticados pueden insertar
CREATE POLICY IF NOT EXISTS "Usuarios pueden insertar documentos"
ON public.audit_documents FOR INSERT
WITH CHECK (true);

-- Política: Solo el dueño puede eliminar
CREATE POLICY IF NOT EXISTS "Solo el dueño puede eliminar"
ON public.audit_documents FOR DELETE
USING (uploaded_by = current_setting('request.jwt.claims', true)::json->>'sub');

-- Añadir comentarios
COMMENT ON TABLE public.audit_documents IS 'Almacena documentos adjuntos a formularios de auditoría';

-- =====================================================
-- ✅ LISTO! La tabla está creada
-- =====================================================
-- Ahora puedes:
-- 1. Cerrar esta ventana
-- 2. Recargar tu aplicación (F5)
-- 3. Intentar subir un archivo nuevamente
-- =====================================================
