
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

// ============================================
// UTILIDADES DE VALIDACIÓN Y NORMALIZACIÓN
// ============================================

// REGLA 2: Parsear y validar metadata
function parseMetadata(metadataInput) {
    if (!metadataInput) return null;

    // Si ya es objeto, retornarlo
    if (typeof metadataInput === 'object' && !Array.isArray(metadataInput)) {
        return metadataInput;
    }

    // Si es string, intentar parsear
    if (typeof metadataInput === 'string') {
        try {
            const parsed = JSON.parse(metadataInput);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
            return null;
        } catch (error) {
            console.error('❌ Error parseando metadata:', error.message);
            return null;
        }
    }

    return null;
}

// REGLA 4: Validar email con regex
function validateEmail(email) {
    if (!email) return true; // Email opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// REGLA 3: Normalizar email (trim + lowercase)
function normalizeEmail(email) {
    if (!email) return null;
    return email.toLowerCase().trim();
}

// REGLA 4: Validar formato de teléfono (mínimo 7 dígitos)
function validatePhone(phone) {
    if (!phone) return true; // Phone opcional
    const digitsOnly = phone.replace(/[^0-9+]/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 20;
}

// REGLA 3: Normalizar teléfono (eliminar espacios y caracteres no numéricos excepto +)
function normalizePhone(phone) {
    if (!phone) return null;
    // Eliminar espacios y caracteres especiales excepto +
    return phone.replace(/[\s\-()]/g, '').trim();
}

// REGLA 4: Validar relationship_type (solo valores permitidos)
function validateRelationshipType(value) {
    if (!value) return true;
    const validTypes = ['parent', 'child', 'none'];
    return validTypes.includes(value.toLowerCase());
}

// REGLA 3: Normalizar relationship_type
function normalizeRelationshipType(value, isGroup) {
    if (!isGroup) return 'none';
    if (!value) return 'none';
    const normalized = value.toLowerCase().trim();
    if (normalized === 'padre' || normalized === 'parent') return 'parent';
    if (normalized === 'hijo' || normalized === 'child') return 'child';
    return 'none';
}

// REGLA 3: Normalizar is_group a booleano válido
function normalizeBoolean(value) {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return false;
}

// REGLA 14: Limitar longitud y sanitizar texto libre
function sanitizeAndTruncate(text, maxLength = 1024) {
    if (!text) return null;
    const trimmed = text.trim();
    if (trimmed.length > maxLength) {
        console.warn(`⚠️  Texto truncado de ${trimmed.length} a ${maxLength} caracteres`);
        return trimmed.substring(0, maxLength);
    }
    return trimmed;
}

// Parsear números con formato de moneda
function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Limpiar formato de moneda y convertir
        const cleanValue = value.replace(/[$,\s]/g, '');
        const parsed = parseFloat(cleanValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

// ============================================
// MIDDLEWARES DE SEGURIDAD Y PERMISOS
// ============================================

// Middleware para verificar rol de socio o admin
function isSocioOrAdmin(req, res, next) {
    const userRole = req.headers['user-role'];
    if (!userRole || !['socio', 'administrador', 'programador'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            error: 'No tiene permisos para esta acción. Se requiere rol de socio o administrador.'
        });
    }
    next();
}

// ============================================
// RATE LIMITING
// ============================================

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX_REQUESTS = 1000;

// Middleware de rate limiting
function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }

    const record = requestCounts.get(ip);

    // Reiniciar contador si pasó la ventana de tiempo
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }

    // Incrementar contador
    record.count++;

    // Verificar límite
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            success: false,
            error: 'Demasiadas solicitudes. Por favor, intenta más tarde.',
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
    }

    next();
}

// Limpiar contadores antiguos cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
        if (now > record.resetTime + RATE_LIMIT_WINDOW) {
            requestCounts.delete(ip);
        }
    }
}, 5 * 60 * 1000);

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
    allowedHeaders: ['Content-Type', 'Authorization', 'user-id'],
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
        const userId = req.user?.id || req.headers['user-id'];
        
        const { data, error } = await supabase
            .from('conjuntos_datos')
            .select('*')
            .eq('user_id', userId) // <- Filtrar por usuario
            .eq('is_active', true)
            .order('fecha_importacion', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error al obtener el último conjunto de datos:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        if (data && data.length > 0) {
            const conjunto = data[0];
            
            // Convertir al formato que espera el frontend
            const responseData = {
                id: conjunto.id,
                filename: conjunto.nombre,
                status: 'processed',
                sheets_data: conjunto.data?.sheets?.map(sheet => ({
                    name: sheet.sheetName,
                    data: sheet.data,
                    rows: sheet.rows,
                    columns: sheet.columns
                })) || [],
                uploadedAt: conjunto.created_at,
                totalSheets: conjunto.data?.totalSheets || 0
            };
            
            res.json({
                success: true,
                data: responseData
            });
        } else {
            res.status(404).json({ success: false, message: 'No se encontraron conjuntos de datos.' });
        }
    } catch (error) {
        console.error('Error en /api/excel/latest:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// Endpoint para procesar el mapeo de columnas y guardar cuentas
app.post('/api/excel/process-mapping', async (req, res) => {
    try {
        const { mappingData, fileId } = req.body;
        
        console.log('🔄 Procesando mapeo de columnas...');
        console.log('📊 Mapping data:', mappingData);
        console.log('🆔 File ID:', fileId);

        if (!mappingData || !fileId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos de mapeo o ID del archivo' 
            });
        }

        // Obtener el conjunto de datos de la base de datos
        const userId = req.user?.id || req.headers['user-id'];
        
        const { data: conjuntoData, error: conjuntoError } = await supabase
            .from('conjuntos_datos')
            .select('*')
            .eq('id', fileId)
            .eq('user_id', userId) // <- Verificar que pertenezca al usuario
            .single();

        if (conjuntoError) {
            console.error('Error obteniendo conjunto de datos:', conjuntoError);
            return res.status(500).json({ 
                success: false, 
                error: 'Error obteniendo datos del Excel' 
            });
        }

        if (!conjuntoData) {
            return res.status(404).json({ 
                success: false, 
                error: 'No se encontraron datos de Excel o no tienes permiso para acceder' 
            });
        }

        const conjunto = conjuntoData; // <- Ya no es array, es objeto directo
        console.log('📋 Procesando conjunto:', conjunto.nombre);

        // Extraer las cuentas del Excel usando el mapeo
        const extractedAccounts = await extractAccountsFromExcel(conjunto, mappingData);
        
        console.log('✅ Cuentas extraídas:', extractedAccounts.length);

        // Guardar las cuentas procesadas en la tabla 'cuentas_contables'
        try {
            const accountsToInsert = extractedAccounts.map(account => ({
                conjunto_id: conjunto.id,
                numero_cuenta: (account.number || '').toString().substring(0, 20),
                nombre_cuenta: (account.name || '').toString().substring(0, 255),
                debito_actual: account.debit || 0,
                credito_actual: account.credit || 0,
                debito_anterior: account.previousYearDebit || 0,
                credito_anterior: account.previousYearCredit || 0,
                clasificado: false,
                created_at: new Date().toISOString()
            }));

            const { data: insertedAccounts, error: insertError } = await supabase
                .from('cuentas_contables')
                .insert(accountsToInsert)
                .select();

            if (insertError) {
                console.error('Error insertando cuentas contables:', insertError);
                console.log('⚠️ Las cuentas se procesaron pero no se guardaron en la tabla cuentas_contables');
            } else {
                console.log(`✅ ${insertedAccounts.length} cuentas guardadas en cuentas_contables.`);
            }

            // Actualizar el conjunto_datos con estado procesado
            const { error: updateConjuntoError } = await supabase
                .from('conjuntos_datos')
                .update({ 
                    estado: 'procesado',
                    updated_at: new Date().toISOString()
                })
                .eq('id', conjunto.id);

            if (updateConjuntoError) {
                console.error('Error actualizando estado del conjunto de datos:', updateConjuntoError);
            }

        } catch (insertError) {
            console.error('Error general al guardar cuentas procesadas:', insertError);
        }
        
        res.json({
            success: true,
            message: 'Mapeo procesado correctamente',
            extractedAccounts: extractedAccounts.length,
            accounts: extractedAccounts
        });
        
    } catch (error) {
        console.error('Error en /api/excel/process-mapping:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor: ' + error.message 
        });
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
                
                // Preparar los datos completos del Excel para guardar
                const excelData = {
                    sheets: workbook.SheetNames.map(sheetName => {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
                        return {
                            sheetName: sheetName,
                            data: jsonData,
                            rows: jsonData.length,
                            columns: jsonData.length > 0 ? jsonData[0].length : 0
                        };
                    }),
                    totalSheets: workbook.SheetNames.length
                };
                
                // Guardar en la base de datos (adaptado a estructura existente)
                if (analysis.success) {
                    try {
                        const userId = req.user?.id || req.headers['user-id'];

                        if (userId) {
                            const { error: deactivateError } = await supabase
                                .from('conjuntos_datos')
                                .update({ is_active: false })
                                .eq('user_id', userId);

                            if (deactivateError) {
                                console.warn('⚠️ Error desactivando datasets anteriores:', deactivateError);
                            }
                        }

                        const { data, error } = await supabase
                            .from('conjuntos_datos')
                            .insert({
                                nombre: file.originalname,
                                tipo: analysis.fileType,
                                fecha_importacion: new Date().toISOString(),
                                total_debitos: analysis.totals.debits || 0,
                                total_creditos: analysis.totals.credits || 0,
                                estado: analysis.isBalanced ? 'balanceado' : 'desbalanceado',
                                archivo_original: file.originalname,
                                data: excelData, // <-- AGREGAR LOS DATOS COMPLETOS DEL EXCEL
                                user_id: userId, // <- AGREGAR USER_ID
                                is_active: true
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

// Detectar mapeo de columnas para el endpoint de cuentas no asignadas
function detectColumnMapping(headers) {
    const mapping = {
        accountNumber: -1,
        accountName: -1,
        currentYear: -1,
        previousYear: -1,
        debit: -1,
        credit: -1
    };

    const numericHeaderIndexes = [];

    headers.forEach((header, index) => {
        if (header == null) return;

        const rawHeader = header.toString().trim();
        const h = rawHeader.toLowerCase();

        if (rawHeader && !isNaN(rawHeader)) {
            numericHeaderIndexes.push(index);
        }

        // Número de cuenta
        if (h.includes('numero') || h.includes('número') || h.includes('num') || h.includes('no.') || h === 'account number') {
            mapping.accountNumber = index;
            return;
        }

        // Nombre de cuenta
        if (h.includes('nombre') || h.includes('descripción') || h.includes('descripcion') || h === 'account name' || h.includes('name')) {
            mapping.accountName = index;
            return;
        }

        // Columna llamada "Cuenta" suele ser nombre si ya existe número
        if (h === 'cuenta') {
            if (mapping.accountNumber >= 0 && mapping.accountNumber !== index) {
                mapping.accountName = index;
            } else {
                mapping.accountNumber = index;
            }
            return;
        }

        // Current Year (2024)
        if (h.includes('current year') || h.includes('2024')) {
            mapping.currentYear = index;
            mapping.debit = index;
            return;
        }

        // Previous Year (2023)
        if (h.includes('previous year') || h.includes('2023') || h.includes('prior year')) {
            mapping.previousYear = index;
            mapping.credit = index;
            return;
        }

        // Débitos
        if (h.includes('débito') || h.includes('debe') || h.includes('debit')) {
            mapping.debit = index;
            return;
        }

        // Créditos
        if (h.includes('crédito') || h.includes('haber') || h.includes('credit')) {
            mapping.credit = index;
        }
    });

    if (mapping.accountName < 0 && mapping.accountNumber >= 0) {
        const fallbackNameIndex = mapping.accountNumber + 1;
        if (fallbackNameIndex < headers.length) {
            mapping.accountName = fallbackNameIndex;
        }
    }

    if (mapping.currentYear < 0 && numericHeaderIndexes.length) {
        mapping.currentYear = numericHeaderIndexes[0];
        mapping.debit = numericHeaderIndexes[0];
    }

    if (mapping.previousYear < 0 && numericHeaderIndexes.length > 1) {
        mapping.previousYear = numericHeaderIndexes[1];
    }

    if (mapping.credit < 0 && mapping.previousYear >= 0) {
        mapping.credit = mapping.previousYear;
    }

    console.log('📍 Mapeo detectado:', mapping);
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
        const userId = req.user?.id || req.headers['user-id'];
        
        if (!accounts || !Array.isArray(accounts)) {
            return res.status(400).json({ success: false, error: 'Datos de cuentas inválidos' });
        }

        if (userId) {
            const { error: deactivateError } = await supabase
                .from('conjuntos_datos')
                .update({ is_active: false })
                .eq('user_id', userId);

            if (deactivateError) {
                console.warn('⚠️ Error desactivando datasets anteriores (save-accounts):', deactivateError);
            }
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
                estado: 'procesado',
                user_id: userId,
                importado_por: userId, // <- Guardar quién importó
                is_active: true
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
        const userId = req.user?.id || req.headers['user-id'];
        
        // Primero obtener los conjuntos de datos
        const { data: datasets, error: datasetsError } = await supabase
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
            .eq('user_id', userId) // <- Filtrar por usuario
            .eq('is_active', true)
            .order('fecha_importacion', { ascending: false })
            .limit(1);

        if (datasetsError) throw datasetsError;

        console.log('📊 Datasets obtenidos:', datasets?.length || 0);
        if (datasets && datasets.length > 0) {
            console.log('🔍 Primer dataset:', {
                id: datasets[0].id,
                importado_por: datasets[0].importado_por,
                nombre: datasets[0].nombre
            });
        }

        // Si hay datasets, obtener información de usuarios por separado
        if (datasets && datasets.length > 0) {
            // Obtener IDs únicos de usuarios desde user_id (importado_por está vacío)
            const userIds = [...new Set(datasets.map(d => d.user_id).filter(Boolean))];
            
            console.log('👤 IDs de usuarios encontrados:', userIds);
            
            if (userIds.length > 0) {
                // Obtener usuarios desde la tabla users - intentar con full_name específicamente
                let users = null;
                let usersError = null;
                
                // Opción 1: Intentar con raw_user_meta_data
                const { data: users1, error: error1 } = await supabase
                    .from('users')
                    .select('id, email, raw_user_meta_data')
                    .in('id', userIds);
                
                if (!error1 && users1) {
                    users = users1;
                    console.log('✅ Usuarios encontrados con raw_user_meta_data');
                } else {
                    console.log('❌ Error con raw_user_meta_data, intentando user_metadata...');
                    // Opción 2: Intentar con user_metadata
                    const { data: users2, error: error2 } = await supabase
                        .from('users')
                        .select('id, email, user_metadata')
                        .in('id', userIds);
                    
                    if (!error2 && users2) {
                        // Mapear user_metadata a raw_user_meta_data para consistencia
                        users = users2.map(u => ({
                            ...u,
                            raw_user_meta_data: u.user_metadata
                        }));
                        console.log('✅ Usuarios encontrados con user_metadata');
                    } else {
                        console.log('❌ Error con user_metadata, intentando solo full_name...');
                        // Opción 3: Intentar específicamente con full_name
                        const { data: users3, error: error3 } = await supabase
                            .from('users')
                            .select('id, email, full_name')
                            .in('id', userIds);
                        
                        if (!error3 && users3) {
                            users = users3;
                            console.log('✅ Usuarios encontrados con full_name');
                        } else {
                            console.log('❌ Error con full_name, usando solo email...');
                            // Opción 4: Último fallback - solo email
                            const { data: users4, error: error4 } = await supabase
                                .from('users')
                                .select('id, email')
                                .in('id', userIds);
                            
                            if (!error4 && users4) {
                                users = users4;
                                console.log('✅ Usuarios encontrados con email únicamente');
                            } else {
                                usersError = error4 || error3 || error2 || error1;
                            }
                        }
                    }
                }
                
                console.log('🔍 Usuarios encontrados:', users?.length || 0);
                if (users) {
                    console.log('👤 Primer usuario completo:', users[0]);
                }
                
                if (!usersError && users) {
                    // Crear mapa de usuarios para lookup rápido
                    const userMap = users.reduce((map, user) => {
                        // Extraer nombre desde múltiples campos en orden de preferencia
                        let userName = user.email || 'Usuario';
                        
                        // 1. Priorizar full_name sobre todo
                        if (user.full_name) {
                            userName = user.full_name;
                            console.log(`📛 Nombre desde full_name: ${userName}`);
                        }
                        // 2. Intentar desde raw_user_meta_data (JSON)
                        else if (user.raw_user_meta_data) {
                            try {
                                const metaData = typeof user.raw_user_meta_data === 'string' 
                                    ? JSON.parse(user.raw_user_meta_data) 
                                    : user.raw_user_meta_data;
                                userName = metaData.name || metaData.nombre || metaData.display_name || metaData.full_name || user.email || 'Usuario';
                                console.log(`📛 Nombre desde raw_user_meta_data: ${userName}`);
                            } catch (e) {
                                console.warn('⚠️ Error parseando raw_user_meta_data:', e);
                            }
                        }
                        // 3. Extraer nombre del email como último fallback
                        if (userName === user.email && user.email) {
                            const emailName = user.email.split('@')[0];
                            userName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                            console.log(`📛 Nombre desde email: ${userName}`);
                        }
                        
                        map[user.id] = {
                            ...user,
                            name: userName
                        };
                        return map;
                    }, {});
                    
                    // Agregar información del usuario a cada dataset usando user_id
                    datasets.forEach(dataset => {
                        if (dataset.user_id && userMap[dataset.user_id]) {
                            dataset.users = userMap[dataset.user_id];
                            console.log(`✅ Dataset ${dataset.id}: Usuario asignado = ${userMap[dataset.user_id].name}`);
                        } else {
                            console.log(`❌ Dataset ${dataset.id}: No se encontró usuario para user_id=${dataset.user_id}`);
                        }
                    });
                } else {
                    console.error('❌ Error obteniendo usuarios:', usersError);
                }
            }
        }

        res.json({ success: true, data: datasets || [] });

    } catch (error) {
        console.error('Error obteniendo conjuntos de datos:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo conjuntos de datos' });
    }
});

// Endpoint para eliminar un dataset completo (conjuntos de datos y relacionados)
app.delete('/api/conjuntos/:id', async (req, res) => {
    try {
        const datasetId = req.params.id;
        const userId = req.user?.id || req.headers['user-id'];
        
        if (!datasetId) {
            return res.status(400).json({ success: false, error: 'ID del dataset es requerido' });
        }
        
        console.log(`🗑️ Eliminando dataset ${datasetId} para usuario ${userId}`);
        
        // 1. Verificar que el dataset exista y pertenezca al usuario
        const { data: dataset, error: datasetError } = await supabase
            .from('conjuntos_datos')
            .select('*')
            .eq('id', datasetId)
            .eq('user_id', userId)
            .single();
            
        if (datasetError || !dataset) {
            return res.status(404).json({ success: false, error: 'Dataset no encontrado o no pertenece al usuario' });
        }
        
        // 2. Eliminar cuentas contables relacionadas
        const { error: cuentasError } = await supabase
            .from('cuentas_contables')
            .delete()
            .eq('conjunto_id', datasetId);
            
        if (cuentasError) {
            console.error('Error eliminando cuentas contables:', cuentasError);
            // Continuar aunque falle la eliminación de cuentas
        }
        
        // 3. Eliminar asignaciones de cuentas
        const { error: assignmentsError } = await supabase
            .from('account_assignments')
            .delete()
            .eq('dataset_id', datasetId);
            
        if (assignmentsError) {
            console.error('Error eliminando asignaciones:', assignmentsError);
            // Continuar aunque falle la eliminación de asignaciones
        }
        
        // 4. Eliminar ajustes financieros relacionados
        const { error: adjustmentsError } = await supabase
            .from('ajustes_financieros')
            .delete()
            .eq('dataset_id', datasetId);
            
        if (adjustmentsError) {
            console.error('Error eliminando ajustes:', adjustmentsError);
            // Continuar aunque falle la eliminación de ajustes
        }
        
        // 5. Eliminar grupos financieros relacionados
        const { error: groupsError } = await supabase
            .from('financial_groups')
            .delete()
            .eq('dataset_id', datasetId);
            
        if (groupsError) {
            console.error('Error eliminando grupos financieros:', groupsError);
            // Continuar aunque falle la eliminación de grupos
        }
        
        // 6. Eliminar validaciones de ledger relacionadas
        const { error: ledgerError } = await supabase
            .from('ledger_integrity_runs')
            .delete()
            .eq('dataset_id', datasetId);
            
        if (ledgerError) {
            console.error('Error eliminando validaciones ledger:', ledgerError);
            // Continuar aunque falle la eliminación de validaciones
        }
        
        // 7. Finalmente eliminar el dataset principal
        const { error: deleteError } = await supabase
            .from('conjuntos_datos')
            .delete()
            .eq('id', datasetId);
            
        if (deleteError) {
            console.error('Error eliminando dataset principal:', deleteError);
            throw new Error('Error eliminando el dataset principal');
        }
        
        console.log(`✅ Dataset ${datasetId} eliminado completamente`);
        
        res.json({ 
            success: true, 
            message: 'Dataset eliminado exitosamente',
            deletedDataset: {
                id: dataset.id,
                nombre: dataset.nombre,
                archivo_original: dataset.archivo_original
            }
        });
        
    } catch (error) {
        console.error('Error eliminando dataset:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Error eliminando dataset' 
        });
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

// Función para extraer cuentas del Excel según el mapeo
async function extractAccountsFromExcel(conjunto, mappingData) {
    try {
        console.log('📊 Procesando hoja:', conjunto.nombre);
        
        // Obtener los datos completos del Excel
        const excelData = conjunto.data;
        if (!excelData || !excelData.sheets || excelData.sheets.length === 0) {
            console.error('❌ No hay datos de Excel disponibles');
            return [];
        }
        
        // Obtener la primera hoja (o la hoja principal)
        const firstSheet = excelData.sheets[0];
        const sheetData = firstSheet.data;
        
        if (!sheetData || sheetData.length === 0) {
            console.error('❌ La hoja de Excel está vacía');
            return [];
        }
        
        console.log('📋 Filas totales:', sheetData.length);
        
        // Convertir mapeo de strings a números
        const mapping = {
            accountNumber: parseInt(mappingData.accountNumber) || 0,
            accountName: parseInt(mappingData.accountName) || 1,
            currentYear: parseInt(mappingData.currentYear) || 2,
            previousYear: parseInt(mappingData.previousYear) || 3,
            currentYearDC: mappingData.currentYearDebitCredit || 'credit',
            previousYearDC: mappingData.previousYearDebitCredit || 'credit'
        };
        
        console.log('🗂️ Mapeo de columnas:', mapping);
        
        // Extraer cuentas (ignorando la primera fila que son encabezados)
        const accounts = [];
        const dataRows = sheetData.slice(1); // Ignorar encabezados
        
        dataRows.forEach((row, index) => {
            // Validar que la fila tenga datos suficientes
            if (!row || row.length <= Math.max(mapping.accountNumber, mapping.accountName)) {
                return;
            }
            
            const accountNumber = row[mapping.accountNumber];
            const accountName = row[mapping.accountName];
            const currentYearValue = row[mapping.currentYear] || 0;
            const previousYearValue = row[mapping.previousYear] || 0;
            
            // Validar que tenga número de cuenta y nombre
            if (!accountNumber || !accountName) {
                return;
            }
            
            // Crear objeto cuenta
            const account = {
                number: accountNumber.toString().trim(),
                name: accountName.toString().trim(),
                currentYear: parseFloat(currentYearValue) || 0,
                previousYear: parseFloat(previousYearValue) || 0
            };
            
            // Asignar valores según el tipo de débito/crédito
            if (mapping.currentYearDC === 'debit') {
                account.debit = account.currentYear;
                account.credit = 0;
            } else {
                account.credit = account.currentYear;
                account.debit = 0;
            }
            
            if (mapping.previousYearDC === 'debit') {
                account.previousYearDebit = account.previousYear;
                account.previousYearCredit = 0;
            } else {
                account.previousYearCredit = account.previousYear;
                account.previousYearDebit = 0;
            }
            
            accounts.push(account);
        });
        
        console.log('✅ Cuentas extraídas exitosamente:', accounts.length);
        return accounts;
        
    } catch (error) {
        console.error('❌ Error extrayendo cuentas del Excel:', error);
        return [];
    }
}

// Endpoint de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Endpoint para obtener cuentas no asignadas
app.get('/api/accounts/unassigned', async (req, res) => {
    try {
        const userId = req.user?.id || req.headers['user-id'];
        
        // Obtener el conjunto de datos activo del usuario actual
        const { data: conjuntoData, error: conjuntoError } = await supabase
            .from('conjuntos_datos')
            .select('*')
            .eq('user_id', userId) // <- Filtrar por usuario
            .eq('is_active', true) // <- Solo datasets activos
            .order('fecha_importacion', { ascending: false })
            .limit(1);

        if (conjuntoError || !conjuntoData || conjuntoData.length === 0) {
            console.error('Error obteniendo datos del Excel:', conjuntoError);
            return res.status(500).json({ 
                success: false, 
                error: 'No se encontraron datos del Excel' 
            });
        }

        const conjunto = conjuntoData[0];
        
        // Obtener los datos del Excel
        const excelData = conjunto.data;
        if (!excelData || !excelData.sheets || excelData.sheets.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No hay datos de Excel disponibles' 
            });
        }

        // Obtener la primera hoja
        const firstSheet = excelData.sheets[0];
        const sheetData = firstSheet.data;
        
        if (!sheetData || sheetData.length <= 1) {
            return res.status(404).json({ 
                success: false, 
                error: 'La hoja de Excel está vacía' 
            });
        }

        // Obtener encabezados
        const headers = sheetData[0];
        
        // Encontrar índices de columnas automáticamente
        const mapping = detectColumnMapping(headers);
        
        // Obtener cuentas desde la base de datos con sus UUIDs reales
        console.log('Obteniendo cuentas desde cuentas_contables...');
        const { data: dbAccounts, error: dbError } = await supabase
            .from('cuentas_contables')
            .select('*')
            .eq('conjunto_id', conjunto.id)
            .order('created_at');
            
        if (dbError) {
            console.error('Error obteniendo cuentas de la base de datos:', dbError);
            // Fallback: usar el método antiguo del Excel
            const accounts = [];
            const dataRows = sheetData.slice(1);
            
            dataRows.forEach((row, index) => {
                if (!row || row.length === 0) return;
                
                const accountNumber = extractAccountNumber(row, mapping.accountNumber);
                const accountName = extractAccountName(row, mapping.accountName);
                const currentYearValue = extractValue(row, mapping.currentYear);
                const previousYearValue = extractValue(row, mapping.previousYear);
                
                if (!accountNumber && !accountName) return;
                
                accounts.push({
                    id: `excel-${index}`,
                    code: accountNumber || `CUENTA-${index}`,
                    name: accountName || '',
                    value: currentYearValue,
                    current_year_value: currentYearValue,
                    previous_year_value: previousYearValue,
                    debit: mapping.debit >= 0 ? extractValue(row, mapping.debit) : 0,
                    credit: mapping.credit >= 0 ? extractValue(row, mapping.credit) : 0,
                    conjunto_id: conjunto.id
                });
            });
            
            res.json({ 
                success: true, 
                data: accounts,
                datasetExists: true
            });
            return;
        }
        
        console.log(`Encontradas ${dbAccounts.length} cuentas en la base de datos`);
        
        // Transformar las cuentas de la base de datos al formato que espera el frontend
        const accounts = dbAccounts.map(account => ({
            id: account.id, // <- UUID real de la base de datos
            code: account.numero_cuenta,
            name: account.nombre_cuenta,
            value: account.debito_actual - account.credito_actual,
            current_year_value: account.debito_actual,
            previous_year_value: account.debito_anterior - account.credito_anterior,
            debit: account.debito_actual,
            credit: account.credito_actual,
            conjunto_id: account.conjunto_id
        }));

        res.json({ 
            success: true, 
            data: accounts 
        });
        
    } catch (error) {
        console.error('Error en /api/accounts/unassigned:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor: ' + error.message 
        });
    }
});

// ============================================
// ENDPOINTS PARA ACCOUNT ASSIGNMENTS
// ============================================

// Guardar asignación de cuenta
app.post('/api/assignments/save', async (req, res) => {
    try {
        console.log('=== INICIO GUARDAR ASIGNACIÓN ===');
        console.log('Headers:', req.headers);
        
        const { 
            datasetId, 
            accountId, 
            groupContentId, 
            parentAccountId, 
            position, 
            meta 
        } = req.body;
        
        console.log('Parsed data:', {
            datasetId,
            accountId,
            groupContentId,
            parentAccountId,
            position,
            meta
        });
        
        const userId = req.headers['user-id'];
        console.log('User ID from header:', userId);
        
        if (!userId || !datasetId || !accountId || !groupContentId) {
            console.error('Faltan datos requeridos:', { datasetId, accountId, groupContentId });
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos: datasetId, accountId, groupContentId' 
            });
        }
        
        // Manejar datasetId de prueba
        let realDatasetId = datasetId;
        if (datasetId === 'test-dataset-id') {
            realDatasetId = '00000000-0000-0000-0000-000000000001';
            console.log('Usando datasetId de prueba:', realDatasetId);
        }

        // Primero buscar el UUID real de la cuenta si accountId no es UUID
        let realAccountId = accountId;
        
        // Detectar si es un ID de prueba o no es un UUID válido
        const isTestAccount = accountId && (
            accountId.toString().startsWith('excel-') || 
            accountId.toString().startsWith('local-') || 
            accountId.toString().startsWith('db-account-') || 
            !accountId.includes('-')
        );
        
        if (isTestAccount) {
            // Si ya es UUID (contiene guiones), usarlo directamente
            if (accountId.includes('-')) {
                realAccountId = accountId;
                console.log('AccountId ya es UUID válido:', realAccountId);
            } else {
                // Para IDs de prueba, generar UUID directamente sin buscar en BD
                console.log('Generando UUID para ID de prueba:', accountId);
                realAccountId = '00000000-0000-0000-0000-' + Math.random().toString(36).substr(2, 12).padStart(12, '0');
                console.log('UUID generado:', realAccountId);
            }
        }
        
        // Asegurar que userId sea un UUID válido
        let realUserId = userId;
        if (!userId || !userId.includes('-')) {
            realUserId = '00000000-0000-0000-0000-' + Math.random().toString(36).substr(2, 12).padStart(12, '0');
            console.log('UUID generado para user:', realUserId);
        }
        
        console.log('Intentando insertar en account_assignments...');
        const insertData = {
            dataset_id: realDatasetId,
            account_id: realAccountId,
            group_content_id: groupContentId,
            parent_account_id: parentAccountId || null,
            position: position || 0,
            user_id: realUserId,
            meta: meta || {}
        };
        
        console.log('Datos a insertar:', insertData);

        const { data, error } = await supabase
            .from('account_assignments')
            .insert(insertData)
            .select()
            .single();

        console.log('Supabase response:', { data, error });

        if (error) {
            console.error('Error guardando asignación:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        console.log('Assignment saved successfully:', data);
        res.json({ 
            success: true, 
            assignment: data 
        });

    } catch (error) {
        console.error('Error en endpoint de asignaciones:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando asignación' 
        });
    }
});

// Obtener asignaciones de un dataset
app.get('/api/assignments/:datasetId', async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.headers['user-id'];
        
        const { data, error } = await supabase
            .from('account_assignments')
            .select(`
                *,
                cuentas_contables(id, numero_cuenta, nombre_cuenta),
                users(id, email)
            `)
            .eq('dataset_id', datasetId)
            .order('position');

        if (error) throw error;

        res.json({ 
            success: true, 
            assignments: data || [] 
        });

    } catch (error) {
        console.error('Error obteniendo asignaciones:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo asignaciones' 
        });
    }
});

// Eliminar asignación
app.delete('/api/assignments/:assignmentId', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const userId = req.headers['user-id'];
        
        const { error } = await supabase
            .from('account_assignments')
            .delete()
            .eq('id', assignmentId)
            .eq('user_id', userId); // Solo el dueño puede eliminar

        if (error) throw error;

        res.json({ 
            success: true, 
            message: 'Asignación eliminada' 
        });

    } catch (error) {
        console.error('Error eliminando asignación:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error eliminando asignación' 
        });
    }
});

// ============================================
// ENDPOINTS PARA AJUSTES FINANCIEROS
// ============================================

// Guardar ajuste financiero
app.post('/api/adjustments/save', async (req, res) => {
    try {
        const { 
            datasetId, 
            accountId, 
            assignmentId, 
            adjustmentType, 
            moneda, 
            monto, 
            descripcion, 
            htmlContenido, 
            adjuntos 
        } = req.body;
        
        const userId = req.headers['user-id'];
        
        if (!userId || !datasetId || !monto) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos' 
            });
        }

        const { data, error } = await supabase
            .from('ajustes_financieros')
            .insert({
                dataset_id: datasetId,
                account_id: accountId || null,
                assignment_id: assignmentId || null,
                adjustment_type: adjustmentType || 'manual',
                moneda: moneda || 'GTQ',
                monto: monto,
                descripcion: descripcion || null,
                html_contenido: htmlContenido || null,
                adjuntos: adjuntos || null,
                created_by: userId
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ 
            success: true, 
            adjustment: data 
        });

    } catch (error) {
        console.error('Error guardando ajuste:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando ajuste' 
        });
    }
});

// Obtener ajustes de un dataset
app.get('/api/adjustments/:datasetId', async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.headers['user-id'];
        
        const { data, error } = await supabase
            .from('ajustes_financieros')
            .select(`
                *,
                cuentas_contables(id, numero_cuenta, nombre_cuenta),
                users(id, email)
            `)
            .eq('dataset_id', datasetId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ 
            success: true, 
            adjustments: data || [] 
        });

    } catch (error) {
        console.error('Error obteniendo ajustes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo ajustes' 
        });
    }
});

// ============================================
// ENDPOINTS PARA LEDGER INTEGRITY
// ============================================

// Guardar validación de libro mayor
app.post('/api/ledger-integrity/save', async (req, res) => {
    try {
        const { datasetId, results, status } = req.body;
        const userId = req.headers['user-id'];
        
        if (!userId || !datasetId || !results) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos' 
            });
        }

        // Crear el run principal
        const { data: run, error: runError } = await supabase
            .from('ledger_integrity_runs')
            .insert({
                dataset_id: datasetId,
                user_id: userId,
                status: status || 'completed',
                meta: { 
                    totalAccounts: results.length,
                    generatedAt: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (runError) throw runError;

        // Guardar cada fila de resultados
        const rows = results.map(result => ({
            run_id: run.id,
            account_id: result.accountId || null,
            group_content_id: result.groupContentId || null,
            label: result.label || '',
            account_code: result.accountCode || '',
            level: result.level || 0,
            is_group: result.isGroup || false,
            prelim: result.prelim || 0,
            ledger: result.ledger || null,
            adjustments: result.adjustments || 0,
            current: result.current || 0,
            previous: result.previous || null,
            difference: result.difference || null,
            order_index: result.orderIndex || 0,
            flags: result.flags || null
        }));

        const { data: insertedRows, error: rowsError } = await supabase
            .from('ledger_integrity_rows')
            .insert(rows)
            .select();

        if (rowsError) throw rowsError;

        res.json({ 
            success: true, 
            run: run,
            rows: insertedRows || []
        });

    } catch (error) {
        console.error('Error guardando validación:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando validación' 
        });
    }
});

// ENDPOINTS PARA FINANCIAL GROUPS RESULTS
// ============================================

// Guardar resultados de grupos financieros
app.post('/api/financial-groups-results/save', async (req, res) => {
    try {
        const { datasetId, results, status } = req.body;
        const userId = req.headers['user-id'];
        
        if (!userId || !datasetId || !results) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos' 
            });
        }

        // Crear el snapshot principal
        const { data: snapshot, error: snapshotError } = await supabase
            .from('financial_group_snapshots')
            .insert({
                dataset_id: datasetId,
                user_id: userId,
                status: status || 'completed',
                meta: { 
                    totalRows: results.length,
                    generatedAt: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (snapshotError) throw snapshotError;

        // Guardar cada fila de resultados
        const rows = results.map(result => ({
            snapshot_id: snapshot.id,
            group_content_id: result.rowId || null,
            parent_row_id: result.parentId || null,
            name: result.accountName || '',
            level: result.level || 0,
            is_group: result.isParent || false,
            prelim: result.preliminary || 0,
            adjustments: result.adjustments || 0,
            current: result.finalCurrent || 0,
            previous: result.finalPrevious || 0,
            order_index: 0,
            metadata: {
                hasChildren: result.hasChildren || false,
                ledgerMissing: result.ledgerMissing || false
            }
        }));

        const { data: insertedRows, error: rowsError } = await supabase
            .from('financial_group_rows')
            .insert(rows)
            .select();

        if (rowsError) throw rowsError;

        res.json({ 
            success: true, 
            snapshot: snapshot,
            rows: insertedRows || []
        });

    } catch (error) {
        console.error('Error guardando resultados de grupos financieros:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando resultados de grupos financieros' 
        });
    }
});

// Endpoint para verificar datos guardados en la base de datos
app.get('/api/verify-database-data', async (req, res) => {
    try {
        // Contar registros en cada tabla usando Supabase
        const [conjuntosResult, assignmentsResult, adjustmentsResult, ledgerResult] = await Promise.all([
            supabase.from('conjuntos_datos').select('*', { count: 'exact', head: true }),
            supabase.from('account_assignments').select('*', { count: 'exact', head: true }),
            supabase.from('ajustes_financieros').select('*', { count: 'exact', head: true }),
            supabase.from('ledger_integrity_runs').select('*', { count: 'exact', head: true })
        ]);
        
        // Obtener últimos registros
        const [latestConjuntos, latestAssignments, latestAdjustments] = await Promise.all([
            supabase.from('conjuntos_datos').select('archivo_original, created_at').order('created_at', { ascending: false }).limit(1),
            supabase.from('account_assignments').select('*').order('created_at', { ascending: false }).limit(3),
            supabase.from('ajustes_financieros').select('*').order('created_at', { ascending: false }).limit(3)
        ]);
        
        // Verificar errores
        if (conjuntosResult.error) throw conjuntosResult.error;
        if (assignmentsResult.error) throw assignmentsResult.error;
        if (adjustmentsResult.error) throw adjustmentsResult.error;
        if (ledgerResult.error) throw ledgerResult.error;
        
        if (latestConjuntos.error) throw latestConjuntos.error;
        if (latestAssignments.error) throw latestAssignments.error;
        if (latestAdjustments.error) throw latestAdjustments.error;
        
        res.json({
            success: true,
            data: {
                counts: {
                    conjuntos_datos: conjuntosResult.count || 0,
                    account_assignments: assignmentsResult.count || 0,
                    ajustes_financieros: adjustmentsResult.count || 0,
                    ledger_integrity_runs: ledgerResult.count || 0
                },
                latest: {
                    excel_file: latestConjuntos.data && latestConjuntos.data.length > 0 ? {
                        filename: latestConjuntos.data[0].archivo_original,
                        created_at: latestConjuntos.data[0].created_at
                    } : null,
                    recent_assignments: latestAssignments.data || [],
                    recent_adjustments: latestAdjustments.data || []
                },
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error verificando datos:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Error verificando datos' 
        });
    }
});

// Endpoint temporal para obtener datasets sin autenticación (solo para debug)
app.get('/api/debug/datasets', async (req, res) => {
    try {
        const { data: datasets, error: datasetsError } = await supabase
            .from('conjuntos_datos')
            .select('id, nombre, user_id, fecha_importacion')
            .order('fecha_importacion', { ascending: false })
            .limit(5);

        if (datasetsError) throw datasetsError;

        console.log('Debug - Datasets encontrados:', datasets?.length || 0);

        res.json({
            success: true,
            data: datasets || []
        });
        
    } catch (error) {
        console.error('Error en debug datasets:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint temporal para ver estructura de tablas
app.get('/api/debug/tables', async (req, res) => {
    try {
        const tableName = req.query.table || 'conjuntos_datos';
        
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (error) {
            return res.json({ success: false, error: error.message, table: tableName });
        }
        
        if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            res.json({ 
                success: true, 
                table: tableName,
                columns: columns,
                sampleRow: data[0] 
            });
        } else {
            res.json({ 
                success: true, 
                table: tableName,
                message: 'No data found',
                columns: [] 
            });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ============================================
// API PARA GRUPOS FINANCIEROS
// ============================================

// Guardar un grupo financiero
app.post('/api/financial-groups/save', async (req, res) => {
    try {
        const { datasetId, groupId, name, type, parentLabel, value, meta } = req.body;
        const userId = req.headers['user-id'];
        
        if (!datasetId || !groupId || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos: datasetId, groupId, name' 
            });
        }
        
        console.log('Guardando grupo financiero:', { datasetId, groupId, name, userId });
        
        const { data, error } = await supabase
            .from('financial_group_rows')
            .insert({
                dataset_id: datasetId,
                group_id: groupId,
                name: name,
                type: type || 'group',
                parent_label: parentLabel || null,
                value: value || 0,
                meta: meta || null,
                user_id: userId
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error guardando grupo financiero:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        console.log('Grupo financiero guardado exitosamente:', data);
        res.json({ 
            success: true, 
            group: data 
        });
        
    } catch (error) {
        console.error('Error en endpoint de grupos financieros:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando grupo financiero' 
        });
    }
});

// Obtener grupos financieros de un dataset
app.get('/api/financial-groups/:datasetId', async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.headers['user-id'];
        
        const { data, error } = await supabase
            .from('financial_group_rows')
            .select('*')
            .eq('dataset_id', datasetId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error obteniendo grupos financieros:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        res.json({ 
            success: true, 
            groups: data || [] 
        });
        
    } catch (error) {
        console.error('Error en endpoint de grupos financieros:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo grupos financieros' 
        });
    }
});

// Obtener el snapshot más reciente de grupos financieros y sus filas
app.get('/api/financial-groups-results/:datasetId/latest', async (req, res) => {
    const { datasetId } = req.params;
    const userId = req.headers['user-id'];

    if (!datasetId || !userId) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere datasetId y user-id en los headers'
        });
    }

    try {
        const { data: snapshot, error: snapshotError } = await supabase
            .from('financial_group_snapshots')
            .select('*')
            .eq('dataset_id', datasetId)
            .eq('user_id', userId)
            .order('generated_at', { ascending: false })
            .limit(1)
            .single();

        if (snapshotError && snapshotError.code !== 'PGRST116') {
            console.error('Error obteniendo snapshot de grupos financieros:', snapshotError);
            return res.status(500).json({ success: false, error: snapshotError.message });
        }

        if (!snapshot) {
            return res.json({ success: true, snapshot: null, rows: [] });
        }

        const { data: rows, error: rowsError } = await supabase
            .from('financial_group_rows')
            .select('*')
            .eq('snapshot_id', snapshot.id)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: true });

        if (rowsError) {
            console.error('Error obteniendo filas del snapshot de grupos financieros:', rowsError);
            return res.status(500).json({ success: false, error: rowsError.message });
        }

        res.json({
            success: true,
            snapshot,
            rows: rows || []
        });

    } catch (error) {
        console.error('Error en endpoint de snapshot de grupos financieros:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo snapshot de grupos financieros' });
    }
});

// Listar snapshots previos de grupos financieros
app.get('/api/financial-groups-results/:datasetId/history', async (req, res) => {
    const { datasetId } = req.params;
    const userId = req.headers['user-id'];
    const { limit = 5 } = req.query;

    if (!datasetId || !userId) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere datasetId y user-id en los headers'
        });
    }

    const parsedLimit = Math.max(1, Math.min(Number(limit) || 5, 50));

    try {
        const { data: snapshots, error } = await supabase
            .from('financial_group_snapshots')
            .select('*')
            .eq('dataset_id', datasetId)
            .eq('user_id', userId)
            .order('generated_at', { ascending: false })
            .limit(parsedLimit);

        if (error) {
            console.error('Error obteniendo historial de snapshots de grupos financieros:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, snapshots: snapshots || [] });

    } catch (error) {
        console.error('Error en endpoint de historial de snapshots:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo historial de snapshots' });
    }
});

// Obtener assignments de un dataset
app.get('/api/assignments/:datasetId', async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.headers['user-id'];
        
        console.log('Loading assignments for dataset:', datasetId, 'user:', userId);
        
        const { data, error } = await supabase
            .from('account_assignments')
            .select('*')
            .eq('dataset_id', datasetId)
            .eq('user_id', userId)
            .order('position', { ascending: true });
        
        if (error) {
            console.error('Error loading assignments:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log('Assignments loaded:', data?.length || 0);
        res.json({ success: true, assignments: data || [] });
        
    } catch (error) {
        console.error('Error in assignments endpoint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener cuentas estáticas del catálogo
app.get('/api/catalog-accounts', async (req, res) => {
    try {
        console.log('Loading catalog accounts...');
        
        const { data, error } = await supabase
            .from('cuentas_contables')
            .select('*')
            .eq('is_active', true)
            .order('level', { ascending: true })
            .order('code', { ascending: true });
        
        if (error) {
            console.error('Error loading catalog accounts:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log('Catalog accounts loaded:', data?.length || 0);
        res.json({ success: true, accounts: data || [] });
        
    } catch (error) {
        console.error('Error in catalog accounts endpoint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API PARA CUENTAS CONTABLES
// ============================================

// Obtener cuenta por código
app.get('/api/accounts/by-code/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.headers['user-id'];
        
        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere code y user-id en los headers'
            });
        }
        
        console.log('Getting account by code:', code, 'user:', userId);
        
        const { data, error } = await supabase
            .from('cuentas_contables')
            .select('*')
            .eq('code', code)
            .eq('conjunto_id', userId) // O usar el dataset_id apropiado
            .single();
        
        if (error) {
            console.error('Error getting account by code:', error);
            return res.status(404).json({ 
                success: false, 
                error: 'Cuenta no encontrada' 
            });
        }
        
        console.log('Account found:', data);
        res.json({ 
            success: true, 
            account: data 
        });
        
    } catch (error) {
        console.error('Error en endpoint de cuenta por código:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo cuenta por código' 
        });
    }
});

// Guardar una cuenta contable
app.post('/api/accounts/save', async (req, res) => {
    try {
        const { datasetId, code, name, value, currentYearValue, previousYearValue, debit, credit, meta } = req.body;
        const userId = req.headers['user-id'];
        
        if (!datasetId || !code || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos: datasetId, code, name' 
            });
        }
        
        console.log('Guardando cuenta contable:', { datasetId, code, name, userId });
        
        const { data, error } = await supabase
            .from('cuentas_contables')
            .insert({
                conjunto_id: datasetId,
                code: code,
                name: name,
                value: value || 0,
                current_year_value: currentYearValue || 0,
                previous_year_value: previousYearValue || 0,
                debit: debit || 0,
                credit: credit || 0,
                meta: meta || null
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error guardando cuenta contable:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        console.log('Cuenta contable guardada exitosamente:', data);
        res.json({ 
            success: true, 
            account: data 
        });
        
    } catch (error) {
        console.error('Error en endpoint de cuentas contables:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando cuenta contable' 
        });
    }
});

// Guardar cuentas contables en lote
app.post('/api/accounts/batch-save', async (req, res) => {
    try {
        const { datasetId, accounts } = req.body;
        const userId = req.headers['user-id'];
        
        if (!datasetId || !accounts || !Array.isArray(accounts)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos: datasetId, accounts (array)' 
            });
        }
        
        console.log('Guardando cuentas en lote:', { datasetId, count: accounts.length, userId });
        
        // Preparar datos para inserción
        const accountsToInsert = accounts.map(account => ({
            conjunto_id: datasetId,
            code: account.code,
            name: account.name,
            value: account.value || 0,
            current_year_value: account.currentYearValue || 0,
            previous_year_value: account.previousYearValue || 0,
            debit: account.debit || 0,
            credit: account.credit || 0,
            meta: account.meta || null
        }));
        
        const { data, error } = await supabase
            .from('cuentas_contables')
            .insert(accountsToInsert)
            .select();
        
        if (error) {
            console.error('Error guardando cuentas en lote:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        console.log('Cuentas guardadas en lote exitosamente:', data?.length || 0);
        res.json({ 
            success: true, 
            accounts: data || [],
            count: data?.length || 0
        });
        
    } catch (error) {
        console.error('Error en endpoint de cuentas en lote:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando cuentas en lote' 
        });
    }
});

// Endpoint para crear tabla financial_groups directamente
app.post('/api/create-financial-groups-table', async (req, res) => {
    try {
        console.log('Creando tabla financial_groups...');
        
        // SQL para crear la tabla
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS public.financial_groups (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                dataset_id UUID NOT NULL REFERENCES public.conjuntos_datos(id) ON DELETE CASCADE,
                group_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'group',
                parent_label TEXT,
                value DECIMAL DEFAULT 0,
                meta JSONB DEFAULT '{}',
                user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', { sql_statement: createTableSQL });
        
        if (error) {
            console.error('Error creando tabla financial_groups:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log('Tabla financial_groups creada exitosamente');
        
        // Crear índices
        const indexSQL = `
            CREATE INDEX IF NOT EXISTS idx_financial_groups_dataset_id ON public.financial_groups(dataset_id);
            CREATE INDEX IF NOT EXISTS idx_financial_groups_user_id ON public.financial_groups(user_id);
            CREATE INDEX IF NOT EXISTS idx_financial_groups_group_id ON public.financial_groups(group_id);
        `;
        
        const indexStatements = indexSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of indexStatements) {
            await supabase.rpc('exec_sql', { sql_statement: statement.trim() });
        }
        
        console.log('Índices creados exitosamente');
        
        res.json({ 
            success: true, 
            message: 'Tabla financial_groups creada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error creando tabla financial_groups:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para verificar columnas de cuentas_contables
app.post('/api/fix-cuentas-contables', async (req, res) => {
    try {
        console.log('Verificando/actualizando tabla cuentas_contables...');
        
        // Añadir columnas si no existen
        const alterSQL = `
            ALTER TABLE public.cuentas_contables 
            ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
            
            ALTER TABLE public.cuentas_contables 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            
            ALTER TABLE public.cuentas_contables 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `;
        
        const statements = alterSQL.split(';').filter(stmt => stmt.trim());
        const results = [];
        
        for (const statement of statements) {
            try {
                const { data, error } = await supabase.rpc('exec_sql', { sql_statement: statement });
                
                if (error) {
                    console.log('Error en alter table:', error);
                    results.push({ statement: statement.substring(0, 50) + '...', error: error.message });
                } else {
                    console.log('Alter table OK:', statement.substring(0, 50) + '...');
                    results.push({ statement: statement.substring(0, 50) + '...', success: true });
                }
            } catch (err) {
                console.log('Error ejecutando alter:', err.message);
                results.push({ statement: statement.substring(0, 50) + '...', error: err.message });
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Tabla cuentas_contables verificada/actualizada',
            results: results
        });
        
    } catch (error) {
        console.error('Error verificando cuentas_contables:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\ud83d\ude80 Servidor CFE INSIGHT corriendo en http://localhost:${PORT}`);
    console.log(`\ud83d\udcc1 Archivos est\u00e1ticos servidos desde: ${path.join(__dirname, 'App')}`);
    console.log(`\ud83d\udcca Procesamiento de archivos Excel habilitado`);
    console.log(`\ud83d\udcdd Account Assignments API habilitada`);
    console.log(`\ud83d\udcca Financial Groups API habilitada`);
    console.log(`\ud83d\udcca Accounts API habilitada`);
});

module.exports = app;
