
require('dotenv').config();

// Validar variables de entorno críticas
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ ERROR: Faltan las siguientes variables de entorno:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n📝 Por favor, crea un archivo .env basado en .env.example');
    process.exit(1);
}

console.log('✅ Variables de entorno cargadas correctamente');

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS: permitir frontend (Vercel) y desarrollo local
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',      // Desarrollo local
            'http://localhost:3001',      // Servidor local (mismo puerto)
            'http://localhost:5000',      // Desarrollo local alternativo
            'http://localhost:8080',      // Desarrollo local alternativo
            process.env.FRONTEND_URL      // Frontend en Vercel o dominio personalizado
        ].filter(Boolean); // Remover valores undefined/null

        // Permitir requests sin origin (por ejemplo, Postman, cURL, apps móviles)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`❌ CORS rechazado para origin: ${origin}`);
            callback(new Error('CORS no permitido'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Aumentar límite para archivos
app.use(express.static(path.join(__dirname, 'CFE INSIGHT/App'))); // Servir archivos estáticos

// Configuración de multer para manejo de archivos
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
    fileFilter: (req, file, cb) => {
        // Permitir archivos Excel, Word, PDF, imágenes y texto
        const allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido'), false);
        }
    }
});

// Configuración de IA
const AI_CONFIG = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        models: {
            chat: 'gpt-3.5-turbo',
            analysis: 'gpt-4'
        }
    }
};

// Contextos para CFE INSIGHT
const AI_CONTEXTS = {
    soporte: 'Eres un asistente experto en auditorías, compromisos y procesos relacionados con CFE INSIGHT. Proporciona respuestas útiles, precisas y profesionales en español. FORMATO DE RESPUESTA: Usa viñetas (•), numeración, y párrafos cortos. Incluye encabezados cuando sea apropiado. Si analizas datos, presenta hallazgos en tablas simples o listas estructuradas. Mantén un tono profesional pero accesible.',
    auditoria: 'Eres un analista de auditoría especializado. Analiza patrones en logs, identifica riesgos y proporciona recomendaciones específicas para CFE INSIGHT. FORMATO DE RESPUESTA: Estructura tus respuestas con: 1) Resumen Ejecutivo, 2) Hallazgos Principales (con viñetas), 3) Recomendaciones (numeradas), 4) Próximos Pasos. Usa tablas para datos cuantitativos.',
    reporte: 'Eres un generador de reportes automatizados. Crea informes claros, estructurados y accionables basados en datos proporcionados. FORMATO DE RESPUESTA: Siempre usa esta estructura: # Título del Reporte\n## Resumen Ejecutivo\n## Hallazgos Detallados\n- Punto 1\n- Punto 2\n## Recomendaciones\n1. Recomendación 1\n2. Recomendación 2\n## Conclusiones',
    chat: 'Eres un asistente de chat inteligente para CFE INSIGHT. Responde de manera amigable, técnica y útil, escalando consultas complejas a humanos cuando sea necesario. FORMATO DE RESPUESTA: Mantén conversaciones naturales pero usa viñetas para listas o pasos. Incluye emojis apropiados para hacer las respuestas más amigables.'
};

// Función para procesar archivos Excel
function processExcelFile(buffer, filename) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        let content = `Archivo Excel: ${filename}\n\n`;

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            content += `Hoja: ${sheetName}\n`;
            content += 'Datos:\n';

            // Mostrar primeras 10 filas para no sobrecargar
            const rowsToShow = jsonData.slice(0, 10);
            rowsToShow.forEach((row, index) => {
                content += `Fila ${index + 1}: ${JSON.stringify(row)}\n`;
            });

            if (jsonData.length > 10) {
                content += `... y ${jsonData.length - 10} filas más\n`;
            }
            content += '\n';
        });

        return content;
    } catch (error) {
        console.error('Error procesando Excel:', error);
        return `[Error procesando archivo Excel: ${filename}]`;
    }
}

// Función para procesar archivos Word
function processWordFile(buffer, filename) {
    // Para archivos Word, por ahora solo devolvemos metadatos
    // En producción, usar librerías como mammoth o officeparser
    return `[Archivo Word: ${filename}, tamaño: ${(buffer.length / 1024 / 1024).toFixed(2)} MB. Contenido no extraíble desde servidor - sugerir conversión a PDF o texto]`;
}

// Función para procesar PDFs
function processPDFFile(buffer, filename) {
    // Para PDFs, por ahora solo devolvemos metadatos
    // En producción, usar librerías como pdf-parse
    return `[Archivo PDF: ${filename}, tamaño: ${(buffer.length / 1024 / 1024).toFixed(2)} MB. Contenido no extraíble desde servidor - sugerir conversión a texto]`;
}

// Función para procesar imágenes
function processImageFile(buffer, filename) {
    return `[Archivo de imagen: ${filename}, tamaño: ${(buffer.length / 1024 / 1024).toFixed(2)} MB. Para análisis de imágenes, usar GPT-4 Vision en futuras versiones]`;
}

// User Management API Endpoints

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;

        // Mapear full_name a name para compatibilidad con el frontend
        const mappedData = data.map(user => ({
            ...user,
            name: user.full_name
        }));

        res.json({ success: true, data: mappedData });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// Get user by username
app.get('/api/users/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore no rows found error

        if (!data) {
            res.status(404).json({ success: false, error: 'User not found' });
        } else {
            // Mapear full_name a name para compatibilidad con el frontend
            const mappedData = { ...data, name: data.full_name };
            res.json({ success: true, data: mappedData });
        }

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
});

// Create a new user
app.post('/api/users', async (req, res) => {
    const { username, password, name, email, phone, role } = req.body;
    console.log('📝 Intentando crear usuario:', { username, name, email, role });
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password, full_name: name, email, phone, role }])
            .select();

        if (error) {
            console.error('❌ Error de Supabase al crear usuario:');
            console.error('   Mensaje:', error.message);
            console.error('   Código:', error.code);
            console.error('   Detalles:', error.details);
            console.error('   Hint:', error.hint);
            console.error('   Error completo:', JSON.stringify(error, null, 2));
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to create user',
                details: error.details,
                hint: error.hint
            });
        }

        console.log('✅ Usuario creado exitosamente:', data[0]);
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('❌ Error inesperado al crear usuario:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create user' });
    }
});

// Update a user
app.put('/api/users/:username', async (req, res) => {
    const username = req.params.username;
    const { password, name, email, phone, role } = req.body;
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ password, full_name: name, email, phone, role })
            .eq('username', username)
            .select();

        if (error) {
            console.error('Error updating user:', error);
            return res.status(500).json({ success: false, error: error.message || 'Failed to update user' });
        }

        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update user' });
    }
});

// Delete a user
app.delete('/api/users/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const { data, error } = await supabase
            .from('users')
            .delete()
            .eq('username', username);

        if (error) throw error;

        res.json({ success: true, data: { message: 'User deleted' } });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// ============================================
// ENTITIES API ENDPOINTS
// ============================================

// Get all entities
app.get('/api/entities', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching entities:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch entities' });
    }
});

// Get entity by ID
app.get('/api/entities/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Entity not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching entity:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch entity' });
    }
});

// Create a new entity
app.post('/api/entities', async (req, res) => {
    const { name, entity_id, description, status } = req.body;
    try {
        const { data, error } = await supabase
            .from('entities')
            .insert([{ name, entity_id, description, status: status || 'activo' }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating entity:', error);
        res.status(500).json({ success: false, error: 'Failed to create entity' });
    }
});

// Update an entity
app.put('/api/entities/:id', async (req, res) => {
    const id = req.params.id;
    const { name, entity_id, description, status } = req.body;
    try {
        const { data, error } = await supabase
            .from('entities')
            .update({ name, entity_id, description, status })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating entity:', error);
        res.status(500).json({ success: false, error: 'Failed to update entity' });
    }
});

// Delete an entity
app.delete('/api/entities/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('entities')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Entity deleted' } });
    } catch (error) {
        console.error('Error deleting entity:', error);
        res.status(500).json({ success: false, error: 'Failed to delete entity' });
    }
});

// ============================================
// COMMITMENTS API ENDPOINTS
// ============================================

// Get all commitments
app.get('/api/commitments', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('commitments')
            .select(`
                *,
                entities (
                    id,
                    name,
                    entity_id
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching commitments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch commitments' });
    }
});

// Get commitment by ID
app.get('/api/commitments/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('commitments')
            .select(`
                *,
                entities (
                    id,
                    name,
                    entity_id
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Commitment not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching commitment:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch commitment' });
    }
});

// Get commitments by entity
app.get('/api/commitments/entity/:entityId', async (req, res) => {
    const entityId = req.params.entityId;
    try {
        const { data, error } = await supabase
            .from('commitments')
            .select('*')
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching commitments by entity:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch commitments' });
    }
});

// Create a new commitment
app.post('/api/commitments', async (req, res) => {
    const { name, description, start_date, end_date, status, entity_id, created_by } = req.body;
    try {
        const { data, error } = await supabase
            .from('commitments')
            .insert([{ name, description, start_date, end_date, status, entity_id, created_by }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating commitment:', error);
        res.status(500).json({ success: false, error: 'Failed to create commitment' });
    }
});

// Update a commitment
app.put('/api/commitments/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, start_date, end_date, status, entity_id } = req.body;
    try {
        const { data, error } = await supabase
            .from('commitments')
            .update({ name, description, start_date, end_date, status, entity_id })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating commitment:', error);
        res.status(500).json({ success: false, error: 'Failed to update commitment' });
    }
});

// Delete a commitment
app.delete('/api/commitments/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('commitments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Commitment deleted' } });
    } catch (error) {
        console.error('Error deleting commitment:', error);
        res.status(500).json({ success: false, error: 'Failed to delete commitment' });
    }
});

// ============================================
// WORK GROUPS API ENDPOINTS
// ============================================

// Get all work groups
app.get('/api/work-groups', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('work_groups')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching work groups:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch work groups' });
    }
});

// Get work group by ID
app.get('/api/work-groups/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('work_groups')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Work group not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching work group:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch work group' });
    }
});

// Create a new work group
app.post('/api/work-groups', async (req, res) => {
    const { name, description, members, commitments } = req.body;
    try {
        const { data, error } = await supabase
            .from('work_groups')
            .insert([{ name, description, members: members || [], commitments: commitments || [] }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating work group:', error);
        res.status(500).json({ success: false, error: 'Failed to create work group' });
    }
});

// Update a work group
app.put('/api/work-groups/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, members, commitments } = req.body;
    try {
        const { data, error } = await supabase
            .from('work_groups')
            .update({ name, description, members, commitments })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating work group:', error);
        res.status(500).json({ success: false, error: 'Failed to update work group' });
    }
});

// Delete a work group
app.delete('/api/work-groups/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('work_groups')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Work group deleted' } });
    } catch (error) {
        console.error('Error deleting work group:', error);
        res.status(500).json({ success: false, error: 'Failed to delete work group' });
    }
});

// ============================================
// RECORDS (LOGS) API ENDPOINTS
// ============================================

// Get all records with pagination
app.get('/api/records', async (req, res) => {
    try {
        const { limit = 100, offset = 0, username, action } = req.query;

        let query = supabase
            .from('records')
            .select('*', { count: 'exact' })
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);

        if (username) {
            query = query.eq('username', username);
        }
        if (action) {
            query = query.eq('action', action);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        res.json({ success: true, data: { data, count, limit, offset } });
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch records' });
    }
});

// Get record by ID
app.get('/api/records/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('records')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Record not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch record' });
    }
});

// Create a new record (log)
app.post('/api/records', async (req, res) => {
    const { username, action, entity, commitment, details } = req.body;
    try {
        const { data, error } = await supabase
            .from('records')
            .insert([{ username, action, entity, commitment, details }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating record:', error);
        res.status(500).json({ success: false, error: 'Failed to create record' });
    }
});

// Delete a record
app.delete('/api/records/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('records')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Record deleted' } });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ success: false, error: 'Failed to delete record' });
    }
});

// Get records by date range
app.get('/api/records/range/:startDate/:endDate', async (req, res) => {
    const { startDate, endDate } = req.params;
    try {
        const { data, error } = await supabase
            .from('records')
            .select('*')
            .gte('timestamp', startDate)
            .lte('timestamp', endDate)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching records by date range:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch records' });
    }
});

// ============================================
// AUDIT FORMS API ENDPOINTS
// ============================================

// Get audit form by type for current user
app.get('/api/audit/forms/:formType', async (req, res) => {
    const { formType } = req.params;
    // TODO: Get user_id from authenticated session
    const user_id = req.headers['user-id']; // Temporary, should come from auth middleware

    if (!user_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const { data, error } = await supabase
            .from('audit_forms')
            .select('*')
            .eq('form_type', formType)
            .eq('user_id', user_id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Formulario no encontrado' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching audit form:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch audit form' });
    }
});

// Create/update audit form
// Endpoint de login deshabilitado: la autenticación se realiza únicamente via Supabase Auth desde el frontend
app.post('/api/auth/login', (_req, res) => {
    return res.status(410).json({
        success: false,
        error: 'Autenticación movida a Supabase Auth. Usa supabase.auth.signInWithPassword desde el frontend.'
    });
});

// ============================================
// AUDIT REVIEWS API ENDPOINTS
// ============================================

// Get reviews for a form
app.get('/api/audit/reviews/:formId', async (req, res) => {
    const { formId } = req.params;

    try {
        const { data, error } = await supabase
            .from('audit_reviews')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching audit reviews:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch audit reviews' });
    }
});

// Update review status (admin only)
app.post('/api/audit/reviews', async (req, res) => {
    const { formId, questionId, reviewed, reviewedBy } = req.body;

    if (!formId || !questionId || reviewed === undefined) {
        return res.status(400).json({ error: 'formId, questionId y reviewed son requeridos' });
    }

    // TODO: Check if user is admin
    // For now, assume reviewedBy is provided and valid

    try {
        // Check if review already exists
        const { data: existingReview } = await supabase
            .from('audit_reviews')
            .select('id')
            .eq('form_id', formId)
            .eq('question_id', questionId)
            .single();

        let result;
        if (existingReview) {
            // Update existing review
            const updateData = { reviewed };
            if (reviewed) {
                updateData.reviewed_by = reviewedBy;
                updateData.reviewed_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('audit_reviews')
                .update(updateData)
                .eq('id', existingReview.id)
                .select();

            if (error) throw error;
            result = data[0];
        } else {
            // Create new review
            const insertData = {
                form_id: formId,
                question_id: questionId,
                reviewed
            };
            if (reviewed) {
                insertData.reviewed_by = reviewedBy;
                insertData.reviewed_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('audit_reviews')
                .insert([insertData])
                .select();

            if (error) throw error;
            result = data[0];
        }

        res.status(existingReview ? 200 : 201).json({ success: true, data: result });
    } catch (error) {
        console.error('Error updating audit review:', error);
        res.status(500).json({ success: false, error: 'Failed to update audit review' });
    }
});

// ============================================

// ============================================
// CLIENTES API ENDPOINTS
// ============================================

// ============================================
// USUARIOS API ENDPOINTS
// ============================================

// Get all users
app.get('/api/usuarios', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching usuarios:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch usuarios' });
    }
});

// Get user by ID
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching usuario:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch usuario' });
    }
});

// Create user
app.post('/api/usuarios', async (req, res) => {
    const body = req.body || {};
    const payload = {
        username: body.username,
        password: body.password,
        full_name: body.full_name || body.name || body.nombre,
        email: body.email || body.correo,
        phone: body.phone || body.telefono,
        role: body.role || body.rol,
        groups: body.groups || body.grupos || []
    };

    if (!payload.username || !payload.password || !payload.full_name || !payload.email || !payload.role) {
        return res.status(400).json({ success: false, error: 'username, password, full_name, email y role son requeridos' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .insert([payload])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating usuario:', error);
        res.status(500).json({ success: false, error: 'Failed to create usuario' });
    }
});

// Update user
app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    const payload = {
        username: body.username,
        password: body.password,
        full_name: body.full_name || body.name || body.nombre,
        email: body.email || body.correo,
        phone: body.phone || body.telefono,
        role: body.role || body.rol,
        groups: body.groups || body.grupos || []
    };

    try {
        const { data, error } = await supabase
            .from('users')
            .update(payload)
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || !data.length) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating usuario:', error);
        res.status(500).json({ success: false, error: 'Failed to update usuario' });
    }
});

// Delete user
app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Usuario eliminado' } });
    } catch (error) {
        console.error('Error deleting usuario:', error);
        res.status(500).json({ success: false, error: 'Failed to delete usuario' });
    }
});


// Get all clientes
app.get('/api/clientes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('clientes')
            .select(`
                *,
                usuarios (
                    id,
                    nombre,
                    correo
                )
            `)
            .order('creado_en', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching clientes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch clientes' });
    }
});

// Get cliente by ID
app.get('/api/clientes/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('clientes')
            .select(`
                *,
                usuarios (
                    id,
                    nombre,
                    correo
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Cliente not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching cliente:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cliente' });
    }
});

// Create a new cliente
app.post('/api/clientes', async (req, res) => {
    const { nombre_empresa, nit, direccion, telefono, user_id } = req.body;
    try {
        const { data, error } = await supabase
            .from('clientes')
            .insert([{ nombre_empresa, nit, direccion, telefono, user_id }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating cliente:', error);
        res.status(500).json({ success: false, error: 'Failed to create cliente' });
    }
});

// Update a cliente
app.put('/api/clientes/:id', async (req, res) => {
    const id = req.params.id;
    const { nombre_empresa, nit, direccion, telefono, user_id } = req.body;
    try {
        const { data, error } = await supabase
            .from('clientes')
            .update({ nombre_empresa, nit, direccion, telefono, user_id })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating cliente:', error);
        res.status(500).json({ success: false, error: 'Failed to update cliente' });
    }
});

// Delete a cliente
app.delete('/api/clientes/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('clientes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Cliente deleted' } });
    } catch (error) {
        console.error('Error deleting cliente:', error);
        res.status(500).json({ success: false, error: 'Failed to delete cliente' });
    }
});

// ============================================
// AUDITORIAS API ENDPOINTS
// ============================================

// Get all auditorias
app.get('/api/auditorias', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('auditorias')
            .select(`
                *,
                clientes (
                    id,
                    nombre_empresa,
                    nit
                ),
                usuarios:auditor_id (
                    id,
                    nombre,
                    correo
                ),
                usuarios:creado_por (
                    id,
                    nombre,
                    correo
                )
            `)
            .order('creado_en', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching auditorias:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch auditorias' });
    }
});

// Get auditoria by ID
app.get('/api/auditorias/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('auditorias')
            .select(`
                *,
                clientes (
                    id,
                    nombre_empresa,
                    nit
                ),
                usuarios:auditor_id (
                    id,
                    nombre,
                    correo
                ),
                usuarios:creado_por (
                    id,
                    nombre,
                    correo
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Auditoria not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching auditoria:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch auditoria' });
    }
});

// Get auditorias by cliente
app.get('/api/auditorias/cliente/:clienteId', async (req, res) => {
    const clienteId = req.params.clienteId;
    try {
        const { data, error } = await supabase
            .from('auditorias')
            .select(`
                *,
                usuarios:auditor_id (
                    id,
                    nombre,
                    correo
                )
            `)
            .eq('cliente_id', clienteId)
            .order('creado_en', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching auditorias by cliente:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch auditorias' });
    }
});

// Create a new auditoria
app.post('/api/auditorias', async (req, res) => {
    const { cliente_id, auditor_id, creado_por, tipo, fecha_inicio, fecha_fin, estado, comentarios } = req.body;
    try {
        const { data, error } = await supabase
            .from('auditorias')
            .insert([{ cliente_id, auditor_id, creado_por, tipo, fecha_inicio, fecha_fin, estado: estado || 'planificada', comentarios }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating auditoria:', error);
        res.status(500).json({ success: false, error: 'Failed to create auditoria' });
    }
});

// Update an auditoria
app.put('/api/auditorias/:id', async (req, res) => {
    const id = req.params.id;
    const { cliente_id, auditor_id, tipo, fecha_inicio, fecha_fin, estado, comentarios } = req.body;
    try {
        const { data, error } = await supabase
            .from('auditorias')
            .update({ cliente_id, auditor_id, tipo, fecha_inicio, fecha_fin, estado, comentarios })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating auditoria:', error);
        res.status(500).json({ success: false, error: 'Failed to update auditoria' });
    }
});

// Delete an auditoria
app.delete('/api/auditorias/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('auditorias')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Auditoria deleted' } });
    } catch (error) {
        console.error('Error deleting auditoria:', error);
        res.status(500).json({ success: false, error: 'Failed to delete auditoria' });
    }
});

// ============================================
// HALLAZGOS API ENDPOINTS
// ============================================

// Get all hallazgos
app.get('/api/hallazgos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hallazgos')
            .select(`
                *,
                auditorias (
                    id,
                    tipo,
                    estado,
                    clientes (
                        id,
                        nombre_empresa
                    )
                ),
                usuarios:registrado_por (
                    id,
                    nombre,
                    correo
                )
            `)
            .order('fecha_registro', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching hallazgos:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch hallazgos' });
    }
});

// Get hallazgo by ID
app.get('/api/hallazgos/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('hallazgos')
            .select(`
                *,
                auditorias (
                    id,
                    tipo,
                    estado,
                    clientes (
                        id,
                        nombre_empresa
                    )
                ),
                usuarios:registrado_por (
                    id,
                    nombre,
                    correo
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Hallazgo not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching hallazgo:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch hallazgo' });
    }
});

// Get hallazgos by auditoria
app.get('/api/hallazgos/auditoria/:auditoriaId', async (req, res) => {
    const auditoriaId = req.params.auditoriaId;
    try {
        const { data, error } = await supabase
            .from('hallazgos')
            .select(`
                *,
                usuarios:registrado_por (
                    id,
                    nombre,
                    correo
                )
            `)
            .eq('auditoria_id', auditoriaId)
            .order('fecha_registro', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching hallazgos by auditoria:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch hallazgos' });
    }
});

// Create a new hallazgo
app.post('/api/hallazgos', async (req, res) => {
    const { auditoria_id, registrado_por, descripcion, severidad, impacto, recomendacion } = req.body;
    try {
        const { data, error } = await supabase
            .from('hallazgos')
            .insert([{ auditoria_id, registrado_por, descripcion, severidad, impacto, recomendacion }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating hallazgo:', error);
        res.status(500).json({ success: false, error: 'Failed to create hallazgo' });
    }
});

// Update a hallazgo
app.put('/api/hallazgos/:id', async (req, res) => {
    const id = req.params.id;
    const { auditoria_id, registrado_por, descripcion, severidad, impacto, recomendacion } = req.body;
    try {
        const { data, error } = await supabase
            .from('hallazgos')
            .update({ auditoria_id, registrado_por, descripcion, severidad, impacto, recomendacion })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating hallazgo:', error);
        res.status(500).json({ success: false, error: 'Failed to update hallazgo' });
    }
});

// Delete a hallazgo
app.delete('/api/hallazgos/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('hallazgos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Hallazgo deleted' } });
    } catch (error) {
        console.error('Error deleting hallazgo:', error);
        res.status(500).json({ success: false, error: 'Failed to delete hallazgo' });
    }
});

// ============================================
// ACCIONES CORRECTIVAS API ENDPOINTS
// ============================================

// Get all acciones_correctivas
app.get('/api/acciones-correctivas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('acciones_correctivas')
            .select(`
                *,
                hallazgos (
                    id,
                    descripcion,
                    severidad,
                    auditorias (
                        id,
                        tipo,
                        clientes (
                            id,
                            nombre_empresa
                        )
                    )
                )
            `)
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching acciones correctivas:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch acciones correctivas' });
    }
});

// Get accion correctiva by ID
app.get('/api/acciones-correctivas/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('acciones_correctivas')
            .select(`
                *,
                hallazgos (
                    id,
                    descripcion,
                    severidad,
                    auditorias (
                        id,
                        tipo,
                        clientes (
                            id,
                            nombre_empresa
                        )
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Accion correctiva not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching accion correctiva:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch accion correctiva' });
    }
});

// Get acciones correctivas by hallazgo
app.get('/api/acciones-correctivas/hallazgo/:hallazgoId', async (req, res) => {
    const hallazgoId = req.params.hallazgoId;
    try {
        const { data, error } = await supabase
            .from('acciones_correctivas')
            .select('*')
            .eq('hallazgo_id', hallazgoId)
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching acciones correctivas by hallazgo:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch acciones correctivas' });
    }
});

// Create a new accion correctiva
app.post('/api/acciones-correctivas', async (req, res) => {
    const { hallazgo_id, descripcion, responsable, fecha_limite, estado, evidencia_url } = req.body;
    try {
        const { data, error } = await supabase
            .from('acciones_correctivas')
            .insert([{ hallazgo_id, descripcion, responsable, fecha_limite, estado: estado || 'pendiente', evidencia_url }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating accion correctiva:', error);
        res.status(500).json({ success: false, error: 'Failed to create accion correctiva' });
    }
});

// Update an accion correctiva
app.put('/api/acciones-correctivas/:id', async (req, res) => {
    const id = req.params.id;
    const { hallazgo_id, descripcion, responsable, fecha_limite, estado, evidencia_url } = req.body;
    try {
        const { data, error } = await supabase
            .from('acciones_correctivas')
            .update({ hallazgo_id, descripcion, responsable, fecha_limite, estado, evidencia_url })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error updating accion correctiva:', error);
        res.status(500).json({ success: false, error: 'Failed to update accion correctiva' });
    }
});

// Delete an accion correctiva
app.delete('/api/acciones-correctivas/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('acciones_correctivas')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Accion correctiva deleted' } });
    } catch (error) {
        console.error('Error deleting accion correctiva:', error);
        res.status(500).json({ success: false, error: 'Failed to delete accion correctiva' });
    }
});

// ============================================
// BITACORA API ENDPOINTS
// ============================================

// Get all bitacora entries
app.get('/api/bitacora', async (req, res) => {
    try {
        const { limit = 100, offset = 0, usuario_id, accion, entidad } = req.query;

        let query = supabase
            .from('bitacora')
            .select(`
                *,
                usuarios (
                    id,
                    nombre,
                    correo
                )
            `, { count: 'exact' })
            .order('fecha', { ascending: false })
            .range(offset, offset + limit - 1);

        if (usuario_id) {
            query = query.eq('usuario_id', usuario_id);
        }
        if (accion) {
            query = query.eq('accion', accion);
        }
        if (entidad) {
            query = query.eq('entidad', entidad);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        res.json({ success: true, data: { data, count, limit, offset } });
    } catch (error) {
        console.error('Error fetching bitacora:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch bitacora' });
    }
});

// Get bitacora entry by ID
app.get('/api/bitacora/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('bitacora')
            .select(`
                *,
                usuarios (
                    id,
                    nombre,
                    correo
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            res.status(404).json({ success: false, error: 'Bitacora entry not found' });
        } else {
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error fetching bitacora entry:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch bitacora entry' });
    }
});

// Get bitacora by date range
app.get('/api/bitacora/range/:startDate/:endDate', async (req, res) => {
    const { startDate, endDate } = req.params;
    try {
        const { data, error } = await supabase
            .from('bitacora')
            .select(`
                *,
                usuarios (
                    id,
                    nombre,
                    correo
                )
            `)
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching bitacora by date range:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch bitacora' });
    }
});

// Create a new bitacora entry
app.post('/api/bitacora', async (req, res) => {
    const { usuario_id, accion, entidad, registro_id } = req.body;
    try {
        const { data, error } = await supabase
            .from('bitacora')
            .insert([{ usuario_id, accion, entidad, registro_id }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Error creating bitacora entry:', error);
        res.status(500).json({ success: false, error: 'Failed to create bitacora entry' });
    }
});

// Delete a bitacora entry
app.delete('/api/bitacora/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { data, error } = await supabase
            .from('bitacora')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, data: { message: 'Bitacora entry deleted' } });
    } catch (error) {
        console.error('Error deleting bitacora entry:', error);
        res.status(500).json({ success: false, error: 'Failed to delete bitacora entry' });
    }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Log the login action
        await supabase
            .from('records')
            .insert([{
                username: username,
                action: 'login',
                entity: null,
                commitment: null,
                details: { ip: req.ip, userAgent: req.get('user-agent') }
            }]);

        // Return user data without password
        const { password: _, ...userWithoutPassword } = data;
        res.json({ user: userWithoutPassword, message: 'Login successful' });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', async (req, res) => {
    const { username } = req.body;

    try {
        // Log the logout action
        await supabase
            .from('records')
            .insert([{
                username: username,
                action: 'logout',
                entity: null,
                commitment: null,
                details: { ip: req.ip, userAgent: req.get('user-agent') }
            }]);

        res.json({ message: 'Logout successful' });

    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Endpoint para procesar archivos y hacer consultas IA
app.post('/api/ai/process-files', upload.array('files', 5), async (req, res) => {
    try {
        const { prompt, context = 'soporte' } = req.body;
        const files = req.files || [];

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt es requerido' });
        }

        let fullPrompt = prompt;

        // Procesar archivos adjuntos
        if (files.length > 0) {
            fullPrompt += '\n\nArchivos adjuntos:\n';

            for (const file of files) {
                try {
                    let fileContent = '';

                    if (file.mimetype.includes('spreadsheet') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
                        fileContent = processExcelFile(file.buffer, file.originalname);
                    } else if (file.mimetype.includes('word') || file.originalname.endsWith('.docx') || file.originalname.endsWith('.doc')) {
                        fileContent = processWordFile(file.buffer, file.originalname);
                    } else if (file.mimetype === 'application/pdf') {
                        fileContent = processPDFFile(file.buffer, file.originalname);
                    } else if (file.mimetype.startsWith('image/')) {
                        fileContent = processImageFile(file.buffer, file.originalname);
                    } else if (file.mimetype === 'text/plain') {
                        fileContent = `Archivo de texto: ${file.originalname}\nContenido:\n${file.buffer.toString('utf-8')}`;
                    } else {
                        fileContent = `[Archivo: ${file.originalname}, tipo: ${file.mimetype}, tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB]`;
                    }

                    fullPrompt += `\n--- ${file.originalname} ---\n${fileContent}\n`;

                } catch (error) {
                    console.error(`Error procesando archivo ${file.originalname}:`, error);
                    fullPrompt += `\n--- ${file.originalname} ---\n[Error procesando archivo]\n`;
                }
            }
        }

        // Llamar a IA con el prompt completo
        const response = await callOpenAI(fullPrompt, AI_CONTEXTS[context] || AI_CONTEXTS.soporte, 1500, 0.7);

        // Log de la interacción
        console.log(`[${new Date().toISOString()}] IA file processing - Context: ${context}, Files: ${files.length}, Prompt length: ${fullPrompt.length}, Response length: ${response.length}`);

        res.json({ response, filesProcessed: files.length });

    } catch (error) {
        console.error('Error en /api/ai/process-files:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'Lo siento, hubo un error al procesar tu consulta con la IA. Por favor, intenta de nuevo más tarde.'
        });
    }
});

// Endpoint proxy para llamadas a IA
app.post('/api/ai/call', async (req, res) => {
    try {
        const { prompt, context = 'soporte', provider = 'openai', options = {} } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt es requerido' });
        }

        const systemPrompt = AI_CONTEXTS[context] || AI_CONTEXTS.soporte;
        const maxTokens = options.maxTokens || 1000;
        const temperature = options.temperature || 0.7;

        let response;

        switch (provider) {
            case 'openai':
                response = await callOpenAI(prompt, systemPrompt, maxTokens, temperature);
                break;
            default:
                return res.status(400).json({ error: `Proveedor ${provider} no soportado` });
        }

        // Log de la interacción (puedes implementar logging más avanzado aquí)
        console.log(`[${new Date().toISOString()}] IA call - Context: ${context}, Prompt length: ${prompt.length}, Response length: ${response.length}`);

        res.json({ response });

    } catch (error) {
        console.error('Error en /api/ai/call:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: 'Lo siento, hubo un error al procesar tu consulta con la IA. Por favor, intenta de nuevo más tarde.'
        });
    }
});

// Función para llamar a OpenAI
async function callOpenAI(prompt, systemPrompt, maxTokens, temperature) {
    const response = await fetch(`${AI_CONFIG.openai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`
        },
        body: JSON.stringify({
            model: AI_CONFIG.openai.models.chat,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature: temperature
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error de OpenAI: ${response.status} ${response.statusText} - ${errorData}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Endpoint para análisis de logs
app.post('/api/ai/analyze-logs', async (req, res) => {
    try {
        const { logs, analysisType = 'general' } = req.body;

        if (!logs || !Array.isArray(logs)) {
            return res.status(400).json({ error: 'Logs son requeridos y deben ser un array' });
        }

        const logsText = logs.map(log =>
            `[${log.timestamp}] ${log.username}: ${log.action} - ${log.entity || 'N/A'} - ${log.commitment || 'N/A'}`
        ).join('\n');

        let prompt;
        switch (analysisType) {
            case 'anomalies':
                prompt = `Analiza estos logs de CFE INSIGHT y identifica anomalías o patrones inusuales:\n\n${logsText}\n\nProporciona un resumen de hallazgos y recomendaciones.`;
                break;
            case 'patterns':
                prompt = `Analiza estos logs de CFE INSIGHT e identifica patrones de comportamiento:\n\n${logsText}\n\nDescribe los patrones encontrados y su significado.`;
                break;
            case 'recommendations':
                prompt = `Basado en estos logs de CFE INSIGHT, proporciona recomendaciones de auditoría:\n\n${logsText}\n\nSugiere mejoras en procesos y controles.`;
                break;
            default:
                prompt = `Analiza estos logs de CFE INSIGHT:\n\n${logsText}\n\nProporciona un resumen ejecutivo de las actividades registradas.`;
        }

        const response = await callOpenAI(prompt, AI_CONTEXTS.auditoria, 1500, 0.7);
        res.json({ response });

    } catch (error) {
        console.error('Error en /api/ai/analyze-logs:', error);
        res.status(500).json({ error: 'Error al analizar logs' });
    }
});

// Endpoint para generar reportes
app.post('/api/ai/generate-report', async (req, res) => {
    try {
        const { data, reportType = 'general' } = req.body;

        let prompt;
        switch (reportType) {
            case 'auditoria':
                prompt = `Genera un reporte de auditoría basado en los siguientes datos de CFE INSIGHT:\n\n${JSON.stringify(data, null, 2)}\n\nEstructura el reporte con: 1) Resumen Ejecutivo, 2) Hallazgos, 3) Recomendaciones, 4) Conclusiones.`;
                break;
            case 'compromisos':
                prompt = `Genera un reporte de seguimiento de compromisos basado en:\n\n${JSON.stringify(data, null, 2)}\n\nIncluye estado actual, riesgos identificados y próximos pasos.`;
                break;
            case 'usuarios':
                prompt = `Genera un reporte de actividad de usuarios basado en:\n\n${JSON.stringify(data, null, 2)}\n\nAnaliza patrones de uso y recomendaciones de capacitación.`;
                break;
            default:
                prompt = `Genera un reporte ejecutivo basado en los siguientes datos:\n\n${JSON.stringify(data, null, 2)}\n\nResume los puntos clave y tendencias.`;
        }

        const response = await callOpenAI(prompt, AI_CONTEXTS.reporte, 2000, 0.7);
        res.json({ response });

    } catch (error) {
        console.error('Error en /api/ai/generate-report:', error);
        res.status(500).json({ error: 'Error al generar reporte' });
    }
});

// Nuevo endpoint para obtener el último conjunto de datos de Excel
app.get('/api/excel/latest', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('conjuntos_datos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error al obtener el último conjunto de datos:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        if (data && data.length > 0) {
            res.json({ success: true, data: data[0] });
        } else {
            res.status(404).json({ success: false, message: 'No se encontraron conjuntos de datos.' });
        }
    } catch (error) {
        console.error('Error en /api/excel/latest:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// Endpoint para previsualizar archivos Excel (sin guardar en BD)
app.post('/api/excel/preview', upload.array('files', 5), async (req, res) => {
    try {
        const files = req.files || [];
        
        if (files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No se proporcionaron archivos' 
            });
        }

        const previews = [];

        for (const file of files) {
            try {
                // Procesar el archivo Excel para previsualización
                const workbook = xlsx.read(file.buffer, { type: 'buffer' });
                const preview = generatePreview(workbook, file.originalname);
                
                previews.push(preview);

            } catch (error) {
                console.error(`Error procesando preview ${file.originalname}:`, error);
                previews.push({
                    success: false,
                    fileName: file.originalname,
                    error: `Error procesando archivo: ${error.message}`
                });
            }
        }

        res.json({
            success: true,
            previews: previews
        });

    } catch (error) {
        console.error('Error en /api/excel/preview:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error procesando archivos' 
        });
    }
});

// Función para generar previsualización de Excel
function generatePreview(workbook, filename) {
    const preview = {
        success: true,
        fileName: filename,
        sheets: [],
        totalSheets: workbook.SheetNames.length
    };

    try {
        workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length > 0) {
                const sheetPreview = {
                    name: sheetName,
                    index: index,
                    headers: jsonData[0] || [],
                    totalRows: jsonData.length,
                    totalColumns: jsonData[0] ? jsonData[0].length : 0,
                    previewData: jsonData.slice(0, 6), // Primeras 6 filas para previsualización
                    detectedType: identifySheetType(sheetName, jsonData[0])
                };
                
                preview.sheets.push(sheetPreview);
            }
        });

    } catch (error) {
        console.error('Error generando preview:', error);
        preview.success = false;
        preview.error = error.message;
    }

    return preview;
}

// Endpoint para subir archivos Excel (estilo CaseWare)
app.post('/api/excel/upload', upload.array('files', 5), async (req, res) => {
    try {
        const files = req.files || [];
        
        if (files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No se proporcionaron archivos' 
            });
        }

        const results = [];

        for (const file of files) {
            try {
                // Procesar el archivo Excel como CaseWare
                const workbook = xlsx.read(file.buffer, { type: 'buffer' });
                const analysis = analyzeExcelLikeCaseWare(workbook, file.originalname);
                
                // Guardar en la base de datos (adaptado a estructura existente)
                if (analysis.success) {
                    try {
                        const { data, error } = await supabase
                            .from('conjuntos_datos')
                            .insert({
                                nombre: file.originalname,
                                tipo: analysis.fileType,
                                fecha_importacion: new Date().toISOString(),
                                total_debitos: analysis.totals.debits || 0,
                                total_creditos: analysis.totals.credits || 0,
                                estado: analysis.isBalanced ? 'balanceado' : 'desbalanceado',
                                archivo_original: file.originalname
                                // user_id se omite temporalmente hasta tener un UUID válido
                            })
                            .select();

                        if (error) {
                            console.error('Error guardando en BD:', error);
                            analysis.savedToDatabase = false;
                            analysis.dbError = error.message;
                        } else {
                            analysis.savedToDatabase = true;
                            analysis.databaseId = data[0].id;
                        }
                    } catch (dbError) {
                        console.error('Error en base de datos:', dbError);
                        analysis.savedToDatabase = false;
                        analysis.dbError = dbError.message;
                    }
                }
                
                results.push(analysis);

            } catch (error) {
                console.error(`Error procesando archivo ${file.originalname}:`, error);
                results.push({
                    success: false,
                    fileName: file.originalname,
                    error: `Error procesando archivo: ${error.message}`
                });
            }
        }

        res.json({
            success: true,
            results: results
        });

    } catch (error) {
        console.error('Error en /api/excel/upload:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error procesando archivos' 
        });
    }
});

// Función de análisis estilo CaseWare IDEA
function analyzeExcelLikeCaseWare(workbook, filename) {
    const analysis = {
        success: true,
        fileName: filename,
        fileType: 'Unknown',
        sheets: [],
        auditFindings: [],
        dataQuality: {},
        statistics: {},
        accounts: [],
        totals: { debits: 0, credits: 0 },
        isBalanced: false,
        anomalies: [],
        recommendations: []
    };

    try {
        // Analizar cada hoja
        workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            
            const sheetAnalysis = analyzeSheetLikeCaseWare(sheetName, jsonData, index);
            analysis.sheets.push(sheetAnalysis);
            
            // Acumular totales
            if (sheetAnalysis.type === 'Trial Balance' || sheetAnalysis.type === 'Balance Sheet') {
                analysis.totals.debits += sheetAnalysis.totals.debits;
                analysis.totals.credits += sheetAnalysis.totals.credits;
                analysis.accounts.push(...sheetAnalysis.accounts);
            }
        });

        // Análisis global estilo CaseWare
        analysis.isBalanced = Math.abs(analysis.totals.debits - analysis.totals.credits) < 0.01;
        
        // Detectar tipo de archivo
        analysis.fileType = detectFileType(analysis.sheets);
        
        // Análisis de calidad de datos
        analysis.dataQuality = analyzeDataQuality(analysis.accounts);
        
        // Generar hallazgos de auditoría
        analysis.auditFindings = generateAuditFindings(analysis.accounts, analysis.totals);
        
        // Estadísticas
        analysis.statistics = {
            totalAccounts: analysis.accounts.length,
            totalSheets: analysis.sheets.length,
            zeroBalanceAccounts: analysis.accounts.filter(acc => 
                Math.abs(acc.debit - acc.credit) < 0.01).length,
            highValueAccounts: analysis.accounts.filter(acc => 
                Math.max(acc.debit, acc.credit) > 1000000).length
        };

        // Detectar anomalías
        analysis.anomalies = detectAnomalies(analysis.accounts);
        
        // Generar recomendaciones
        analysis.recommendations = generateRecommendations(analysis);

    } catch (error) {
        console.error('Error en análisis CaseWare:', error);
        analysis.success = false;
        analysis.error = error.message;
        
        // Asegurar que todas las propiedades tengan valores predeterminados
        analysis.statistics = analysis.statistics || {
            totalAccounts: 0,
            totalSheets: 0,
            zeroBalanceAccounts: 0,
            highValueAccounts: 0
        };
        analysis.dataQuality = analysis.dataQuality || {
            completeness: { withAccountNumber: '0%', withAccountName: '0%' },
            balanceAnalysis: { zeroBalance: '0%', negativeBalance: '0%' },
            score: 0
        };
        analysis.auditFindings = analysis.auditFindings || [];
        analysis.anomalies = analysis.anomalies || [];
        analysis.recommendations = analysis.recommendations || [];
    }

    return analysis;
}

// Analizar hoja individual estilo CaseWare
function analyzeSheetLikeCaseWare(sheetName, jsonData, sheetIndex) {
    const sheetAnalysis = {
        name: sheetName,
        type: 'Unknown',
        rows: jsonData.length,
        columns: jsonData[0] ? jsonData[0].length : 0,
        accounts: [],
        totals: { debits: 0, credits: 0 },
        hasHeaders: false,
        dataRange: null,
        quality: {}
    };

    // Detectar si tiene encabezados
    if (jsonData.length > 1) {
        sheetAnalysis.hasHeaders = detectHeaders(jsonData[0]);
        const dataStart = sheetAnalysis.hasHeaders ? 1 : 0;
        const dataRows = jsonData.slice(dataStart);
        
        // Identificar tipo de hoja
        sheetAnalysis.type = identifySheetType(sheetName, jsonData[0]);
        
        // Extraer cuentas si es balance o estado financiero
        if (sheetAnalysis.type === 'Trial Balance' || sheetAnalysis.type === 'Balance Sheet') {
            console.log(`📊 Analizando hoja: ${sheetName}`);
            console.log(`📋 Encabezados:`, jsonData[0]);
            
            const accounts = extractAccountsFromRows(dataRows, jsonData[0]);
            sheetAnalysis.accounts = accounts;
            
            console.log(`📈 Cuentas extraídas: ${accounts.length}`);
            console.log(`💰 Primeras 3 cuentas:`, accounts.slice(0, 3));
            
            // Calcular totales
            accounts.forEach(acc => {
                sheetAnalysis.totals.debits += acc.debit;
                sheetAnalysis.totals.credits += acc.credit;
            });
            
            console.log(`💵 Totales calculados: Débitos=${sheetAnalysis.totals.debits}, Créditos=${sheetAnalysis.totals.credits}`);
        }
        
        // Análisis de calidad
        sheetAnalysis.quality = analyzeSheetQuality(dataRows);
    }

    return sheetAnalysis;
}

// Detectar encabezados
function detectHeaders(firstRow) {
    const headerPatterns = ['cuenta', 'número', 'descripción', 'débito', 'crédito', 'saldo'];
    return firstRow.some(cell => 
        cell && typeof cell === 'string' && 
        headerPatterns.some(pattern => 
            cell.toLowerCase().includes(pattern)
        )
    );
}

// Identificar tipo de hoja
function identifySheetType(sheetName, headers) {
    const name = sheetName.toLowerCase();
    const headerStr = headers ? headers.join(' ').toLowerCase() : '';
    
    if (name.includes('balance') || name.includes('trial') || 
        headerStr.includes('débito') || headerStr.includes('crédito')) {
        return 'Trial Balance';
    } else if (name.includes('income') || name.includes('pérdidas') || 
               name.includes('ganancias')) {
        return 'Income Statement';
    } else if (name.includes('balance sheet') || name.includes('estado') || 
               name.includes('situación')) {
        return 'Balance Sheet';
    } else if (name.includes('cash') || name.includes('efectivo')) {
        return 'Cash Flow';
    }
    
    return 'Data Sheet';
}

// Extraer cuentas de las filas
function extractAccountsFromRows(dataRows, headers) {
    const accounts = [];
    const colMapping = mapColumns(headers);
    
    console.log(`🔍 Procesando ${dataRows.length} filas con mapeo:`, colMapping);
    
    dataRows.forEach((row, index) => {
        if (row && row.length > 0 && isValidAccountRow(row)) {
            let debitValue = 0;
            let creditValue = 0;
            
            // Extraer valores según el mapeo
            if (colMapping.debit >= 0 && colMapping.credit >= 0) {
                // Si hay columnas separadas de débito/crédito
                debitValue = extractValue(row, colMapping.debit);
                creditValue = extractValue(row, colMapping.credit);
            } else if (colMapping.debit >= 0) {
                // Si solo hay una columna (saldos), separar positivos/negativos
                const balanceValue = extractValue(row, colMapping.debit);
                if (balanceValue >= 0) {
                    debitValue = balanceValue;
                    creditValue = 0;
                } else {
                    debitValue = 0;
                    creditValue = Math.abs(balanceValue);
                }
            }
            
            const account = {
                row: index + 2, // +2 porque incluye encabezado y es 1-based
                number: extractAccountNumber(row, colMapping.number),
                name: extractAccountName(row, colMapping.name),
                debit: debitValue,
                credit: creditValue,
                balance: 0
            };
            
            account.balance = account.debit - account.credit;
            
            console.log(`📊 Fila ${index + 2}: ${account.number} - ${account.name} | Débito: ${account.debit} | Crédito: ${account.credit}`);
            
            if (account.number || account.name) {
                accounts.push(account);
            }
        }
    });
    
    console.log(`📈 Total cuentas procesadas: ${accounts.length}`);
    return accounts;
}

// Mapear columnas
function mapColumns(headers) {
    const mapping = { number: -1, name: -1, debit: -1, credit: -1 };
    
    if (!headers) return mapping;
    
    console.log(`🔍 Mapeando columnas para encabezados:`, headers);
    
    headers.forEach((header, index) => {
        if (header) {
            const h = header.toString().toLowerCase();
            
            // Número de cuenta (español e inglés) - buscar "Account Number" específicamente primero
            if (h === 'account number' || h === 'cuenta' || h === 'número') {
                mapping.number = index;
            }
            // Nombre de cuenta (español e inglés) - buscar "Account Name" específicamente primero
            else if (h === 'account name' || h === 'nombre' || h === 'descripción') {
                mapping.name = index;
            }
            // Débitos (español e inglés)
            else if (h.includes('débito') || h.includes('debe') || h.includes('debit')) {
                mapping.debit = index;
            }
            // Créditos (español e inglés)
            else if (h.includes('crédito') || h.includes('haber') || h.includes('credit')) {
                mapping.credit = index;
            }
        }
    });
    
    // Si no se encontraron débitos/créditos específicos, intentar con columnas de año
    if (mapping.debit === -1 && mapping.credit === -1) {
        headers.forEach((header, index) => {
            if (header) {
                const h = header.toString().toLowerCase();
                // Buscar columnas que parezcan años (ej: "Current Year (2024)")
                if (h.includes('current year') || h.includes('2024')) {
                    mapping.debit = index; // Asumir que la columna del año actual es débito
                }
                else if (h.includes('prior year') || h.includes('2023')) {
                    mapping.credit = index; // Asumir que la columna del año anterior es crédito
                }
            }
        });
    }
    
    console.log(`📍 Mapeo de columnas:`, mapping);
    return mapping;
}

// Validar fila de cuenta
function isValidAccountRow(row) {
    // No es fila válida si está vacía o solo tiene números sin texto
    const hasText = row.some(cell => cell && typeof cell === 'string' && cell.trim().length > 0);
    const hasNumbers = row.some(cell => cell && !isNaN(cell));
    return hasText || hasNumbers;
}

// Extraer número de cuenta
function extractAccountNumber(row, colIndex) {
    if (colIndex >= 0 && row[colIndex]) {
        const value = row[colIndex].toString().trim();
        // Extraer solo números si es texto mixto
        const numbers = value.match(/\d+/);
        return numbers ? numbers[0] : value;
    }
    return '';
}

// Extraer nombre de cuenta
function extractAccountName(row, colIndex) {
    if (colIndex >= 0 && row[colIndex]) {
        return row[colIndex].toString().trim();
    }
    return '';
}

// Extraer valor numérico
function extractValue(row, colIndex) {
    if (colIndex >= 0 && row[colIndex]) {
        const value = parseFloat(row[colIndex]);
        return isNaN(value) ? 0 : value;
    }
    return 0;
}

// Detectar tipo de archivo
function detectFileType(sheets) {
    const hasTrialBalance = sheets.some(s => s.type === 'Trial Balance');
    const hasIncomeStatement = sheets.some(s => s.type === 'Income Statement');
    const hasBalanceSheet = sheets.some(s => s.type === 'Balance Sheet');
    
    if (hasTrialBalance && hasIncomeStatement && hasBalanceSheet) {
        return 'Financial Statements Package';
    } else if (hasTrialBalance) {
        return 'Trial Balance';
    } else if (hasIncomeStatement) {
        return 'Income Statement';
    } else if (hasBalanceSheet) {
        return 'Balance Sheet';
    }
    
    return 'General Data';
}

// Análisis de calidad de datos
function analyzeDataQuality(accounts) {
    const total = accounts.length;
    const withNumber = accounts.filter(acc => acc.number).length;
    const withName = accounts.filter(acc => acc.name).length;
    const withZeroBalance = accounts.filter(acc => Math.abs(acc.balance) < 0.01).length;
    const withNegativeBalance = accounts.filter(acc => acc.balance < 0).length;
    
    return {
        completeness: {
            withAccountNumber: (withNumber / total * 100).toFixed(1) + '%',
            withAccountName: (withName / total * 100).toFixed(1) + '%'
        },
        balanceAnalysis: {
            zeroBalance: (withZeroBalance / total * 100).toFixed(1) + '%',
            negativeBalance: (withNegativeBalance / total * 100).toFixed(1) + '%'
        },
        score: calculateDataQualityScore(accounts)
    };
}

// Calcular score de calidad
function calculateDataQualityScore(accounts) {
    let score = 100;
    const total = accounts.length;
    
    // Penalizar datos faltantes
    score -= (accounts.filter(acc => !acc.number).length / total) * 20;
    score -= (accounts.filter(acc => !acc.name).length / total) * 15;
    
    // Penalizar inconsistencias
    score -= (accounts.filter(acc => acc.debit > 0 && acc.credit > 0).length / total) * 25;
    
    return Math.max(0, Math.round(score));
}

// Generar hallazgos de auditoría
function generateAuditFindings(accounts, totals) {
    const findings = [];
    
    // Verificar balance
    if (Math.abs(totals.debits - totals.credits) > 0.01) {
        findings.push({
            type: 'Error',
            severity: 'High',
            description: 'Balance no cuadra',
            detail: `Débitos: $${totals.debits.toLocaleString()}, Créditos: $${totals.credits.toLocaleString()}`,
            recommendation: 'Revisar cálculos y registros contables'
        });
    }
    
    // Detectar cuentas sin número
    const withoutNumber = accounts.filter(acc => !acc.number);
    if (withoutNumber.length > 0) {
        findings.push({
            type: 'Warning',
            severity: 'Medium',
            description: 'Cuentas sin número',
            detail: `${withoutNumber.length} cuentas no tienen número de cuenta`,
            recommendation: 'Asignar números de cuenta según catálogo contable'
        });
    }
    
    // Detectar valores inusualmente altos
    const highValues = accounts.filter(acc => Math.max(acc.debit, acc.credit) > 10000000);
    if (highValues.length > 0) {
        findings.push({
            type: 'Information',
            severity: 'Low',
            description: 'Cuentas con valores altos',
            detail: `${highValues.length} cuentas superan los $10,000,000`,
            recommendation: 'Verificar transacciones de alto valor'
        });
    }
    
    return findings;
}

// Detectar anomalías
function detectAnomalies(accounts) {
    const anomalies = [];
    
    // Cuentas con débito y crédito simultáneos
    const bothSides = accounts.filter(acc => acc.debit > 0 && acc.credit > 0);
    if (bothSides.length > 0) {
        anomalies.push({
            type: 'Double Entry',
            count: bothSides.length,
            description: 'Cuentas con valores en ambas columnas'
        });
    }
    
    // Cuentas con saldos negativos inusuales
    const negativeSaldos = accounts.filter(acc => acc.balance < -1000);
    if (negativeSaldos.length > 0) {
        anomalies.push({
            type: 'Negative Balance',
            count: negativeSaldos.length,
            description: 'Cuentas con saldos deudores negativos significativos'
        });
    }
    
    return anomalies;
}

// Generar recomendaciones
function generateRecommendations(analysis) {
    const recommendations = [];
    
    if (!analysis.isBalanced) {
        recommendations.push('Revisar el balance de comprobación para asegurar que débitos = créditos');
    }
    
    if (analysis.dataQuality.score < 80) {
        recommendations.push('Mejorar la calidad de los datos: completar números y nombres de cuentas');
    }
    
    if (analysis.statistics.zeroBalanceAccounts > analysis.statistics.totalAccounts * 0.1) {
        recommendations.push('Revisar cuentas con saldo cero - podrían ser innecesarias');
    }
    
    recommendations.push('Considerar realizar análisis de tendencia para detectar variaciones inusuales');
    recommendations.push('Documentar los hallazgos de auditoría para seguimiento');
    
    return recommendations;
}

// Analizar calidad de hoja
function analyzeSheetQuality(dataRows) {
    const totalRows = dataRows.length;
    const emptyRows = dataRows.filter(row => !row || row.every(cell => !cell)).length;
    const validRows = totalRows - emptyRows;
    
    return {
        totalRows,
        emptyRows,
        validRows,
        completeness: ((validRows / totalRows) * 100).toFixed(1) + '%'
    };
}

// Endpoint para guardar cuentas y saldos
app.post('/api/excel/save-accounts', async (req, res) => {
    try {
        const { accounts, totalDebits, totalCredits, fileName } = req.body;
        
        if (!accounts || !Array.isArray(accounts)) {
            return res.status(400).json({ success: false, error: 'Datos de cuentas inválidos' });
        }

        // Crear registro del conjunto de datos
        const { data: dataset, error: datasetError } = await supabase
            .from('conjuntos_datos')
            .insert([{
                nombre: fileName,
                tipo: 'balance_comprobacion',
                fecha_importacion: new Date().toISOString(),
                total_debitos: totalDebits,
                total_creditos: totalCredits,
                estado: 'procesado'
            }])
            .select()
            .single();

        if (datasetError) throw datasetError;

        // Guardar cuentas individuales
        const accountsToInsert = accounts.map(account => ({
            conjunto_id: dataset.id,
            numero_cuenta: account.number,
            nombre_cuenta: account.name,
            debito_actual: account.currentYearDebit,
            credito_actual: account.currentYearCredit,
            debito_anterior: account.previousYearDebit,
            credito_anterior: account.previousYearCredit,
            saldo: account.currentYearDebit - account.currentYearCredit,
            fecha_creacion: new Date().toISOString()
        }));

        const { data: savedAccounts, error: accountsError } = await supabase
            .from('cuentas_contables')
            .insert(accountsToInsert)
            .select();

        if (accountsError) throw accountsError;

        res.json({
            success: true,
            message: 'Cuentas guardadas exitosamente',
            dataset: dataset,
            accounts: savedAccounts
        });

    } catch (error) {
        console.error('Error guardando cuentas:', error);
        res.status(500).json({ success: false, error: 'Error guardando cuentas' });
    }
});

// Endpoint para guardar clasificaciones de cuentas
app.post('/api/excel/save-classifications', async (req, res) => {
    try {
        const { classifications, accounts, datasetId } = req.body;
        
        if (!classifications || !accounts) {
            return res.status(400).json({ success: false, error: 'Datos de clasificación inválidos' });
        }

        // Actualizar clasificaciones de cuentas
        const updates = [];
        Object.keys(classifications).forEach(accountIndex => {
            const account = accounts[accountIndex];
            const classification = classifications[accountIndex];
            
            updates.push({
                id: account.id, // Asumiendo que tenemos el ID
                grupo_financiero: classification,
                fecha_clasificacion: new Date().toISOString(),
                clasificado: true
            });
        });

        // Actualizar en lote
        const { data: updatedAccounts, error: updateError } = await supabase
            .from('cuentas_contables')
            .upsert(updates)
            .select();

        if (updateError) throw updateError;

        // Generar estados financieros
        const financialStatements = generateFinancialStatements(accounts, classifications);
        
        // Guardar estados financieros
        const { data: savedStatements, error: statementsError } = await supabase
            .from('estados_financieros')
            .insert([{
                conjunto_id: datasetId,
                tipo: 'balance_general',
                datos: financialStatements.balanceSheet,
                fecha_generacion: new Date().toISOString(),
                version: 1
            }])
            .select();

        if (statementsError) throw statementsError;

        res.json({
            success: true,
            message: 'Clasificaciones guardadas exitosamente',
            accounts: updatedAccounts,
            statements: savedStatements
        });

    } catch (error) {
        console.error('Error guardando clasificaciones:', error);
        res.status(500).json({ success: false, error: 'Error guardando clasificaciones' });
    }
});

// Función auxiliar para generar estados financieros
function generateFinancialStatements(accounts, classifications) {
    const balanceSheet = {
        activo: { accounts: [], total: 0 },
        pasivo: { accounts: [], total: 0 },
        patrimonio: { accounts: [], total: 0 }
    };
    
    const incomeStatement = {
        ingresos: { accounts: [], total: 0 },
        gastos: { accounts: [], total: 0 }
    };

    accounts.forEach((account, index) => {
        const classification = classifications[index];
        const balance = account.currentYearDebit - account.currentYearCredit;
        
        if (classification === 'activo' || classification === 'pasivo' || classification === 'patrimonio') {
            balanceSheet[classification].accounts.push({
                ...account,
                balance: Math.abs(balance)
            });
            balanceSheet[classification].total += Math.abs(balance);
        } else if (classification === 'ingresos' || classification === 'gastos') {
            const result = classification === 'ingresos' ? 
                account.currentYearCredit - account.currentYearDebit :
                account.currentYearDebit - account.currentYearCredit;
            
            incomeStatement[classification].accounts.push({
                ...account,
                result: Math.abs(result)
            });
            incomeStatement[classification].total += Math.abs(result);
        }
    });

    return { balanceSheet, incomeStatement };
}

// Endpoint para obtener conjuntos de datos
app.get('/api/excel/datasets', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('conjuntos_datos')
            .select(`
                *,
                cuentas_contables (
                    id,
                    numero_cuenta,
                    nombre_cuenta,
                    saldo,
                    grupo_financiero
                )
            `)
            .order('fecha_importacion', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data: data });

    } catch (error) {
        console.error('Error obteniendo conjuntos de datos:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo conjuntos de datos' });
    }
});

// Endpoint para subir y procesar archivos Excel
app.post('/api/excel/upload', upload.array('files', 5), async (req, res) => {
    try {
        const files = req.files || [];
        
        if (files.length === 0) {
            return res.status(400).json({ success: false, error: 'No se subieron archivos' });
        }

        const processedFiles = [];

        for (const file of files) {
            if (!file.mimetype.includes('spreadsheet') && !file.originalname.endsWith('.xlsx') && !file.originalname.endsWith('.xls')) {
                return res.status(400).json({ success: false, error: 'Solo se permiten archivos Excel' });
            }

            try {
                const workbook = xlsx.read(file.buffer, { type: 'buffer' });
                const sheetNames = workbook.SheetNames;
                
                if (sheetNames.length === 0) {
                    return res.status(400).json({ success: false, error: 'El archivo Excel no contiene hojas' });
                }

                // Procesar la primera hoja
                const firstSheet = workbook.Sheets[sheetNames[0]];
                const jsonData = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
                
                if (jsonData.length === 0) {
                    return res.status(400).json({ success: false, error: 'La hoja está vacía' });
                }

                // Extraer columnas de la primera fila
                const columns = jsonData[0] || [];
                const dataRows = jsonData.slice(1).filter(row => row && row.some(cell => cell !== null && cell !== ''));
                
                processedFiles.push({
                    filename: file.originalname,
                    sheetName: sheetNames[0],
                    columns: columns,
                    data: dataRows,
                    totalRows: dataRows.length
                });

            } catch (error) {
                console.error(`Error procesando archivo ${file.originalname}:`, error);
                return res.status(500).json({ success: false, error: `Error procesando archivo ${file.originalname}` });
            }
        }

        res.json({ 
            success: true, 
            message: 'Archivos procesados correctamente',
            files: processedFiles
        });

    } catch (error) {
        console.error('Error en /api/excel/upload:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor CFE INSIGHT corriendo en http://localhost:${PORT}`);
    console.log(`📁 Archivos estáticos servidos desde: ${path.join(__dirname, 'App')}`);
    console.log(`📊 Procesamiento de archivos Excel habilitado`);
});

module.exports = app;
