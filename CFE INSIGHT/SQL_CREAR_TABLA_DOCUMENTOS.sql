-- =====================================================
-- CREAR TABLA audit_documents
-- CFE INSIGHT - Sistema de Documentos de Auditoría
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ve a: https://supabase.com/dashboard
-- 2. Abre SQL Editor → New Query
-- 3. Copia y pega TODO este archivo
-- 4. Haz clic en "Run" (Ctrl+Enter)
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
USING (uploaded_by = current_setting('request.jwt.claims')::json->>'sub');

-- Añadir comentarios para documentación
COMMENT ON TABLE public.audit_documents IS 'Almacena documentos adjuntos a formularios de auditoría';
COMMENT ON COLUMN public.audit_documents.id IS 'Identificador único del documento';
COMMENT ON COLUMN public.audit_documents.form_id IS 'ID del formulario asociado (nullable)';
COMMENT ON COLUMN public.audit_documents.commitment_id IS 'ID del compromiso asociado';
COMMENT ON COLUMN public.audit_documents.document_name IS 'Nombre original del archivo';
COMMENT ON COLUMN public.audit_documents.document_url IS 'URL pública del archivo en Storage';
COMMENT ON COLUMN public.audit_documents.document_type IS 'Tipo MIME del archivo';
COMMENT ON COLUMN public.audit_documents.file_size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN public.audit_documents.uploaded_by IS 'ID del usuario que subió el archivo';
COMMENT ON COLUMN public.audit_documents.description IS 'Descripción opcional del documento';
COMMENT ON COLUMN public.audit_documents.category IS 'Categoría del documento';

-- =====================================================
-- ✅ SI VES "Success. No rows returned" = TODO OK
-- =====================================================
-- Ejecuta después: node check-audit-documents.js
-- =====================================================
