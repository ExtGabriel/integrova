

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { validate } = require('./validators');
require('dotenv').config(); // Cargar variables de entorno

// Inicializar Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de Supabase - VALIDAR VARIABLES DE ENTORNO
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// En entorno de pruebas, permitir valores de test
const isTestEnv = process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined;

// Modo demo: permitir ejecutar sin Supabase para pruebas
const isDemoMode = process.env.DEMO_MODE === 'true';

if (!isTestEnv && !isDemoMode && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('❌ ERROR: Variables de entorno requeridas:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('Crea un archivo .env con estas variables.');
    console.error('O establece DEMO_MODE=true para modo de demostración.');
    process.exit(1);
}

if (!isTestEnv && (SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.includes('YourServiceKeyHere')) ||
    (SUPABASE_URL && SUPABASE_URL.includes('YourAnonKeyHere'))) {
    console.error('❌ ERROR: Las claves de Supabase no están configuradas correctamente.');
    console.error('Reemplaza los valores en el archivo .env con las claves reales de Supabase.');
    process.exit(1);
}

// Inicializar cliente Supabase (solo si no estamos en test)
let supabase = null;
if (!isTestEnv) {
    console.log('🔍 Debug - SUPABASE_URL:', SUPABASE_URL ? 'Definido' : 'UNDEFINED');
    console.log('🔍 Debug - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Definido' : 'UNDEFINED');
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Configuración de CORS: permitir frontend (Vercel) y desarrollo local
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',      // Desarrollo local
            'http://localhost:5000',      // Desarrollo local alternativo
            'http://localhost:8080',      // Desarrollo local alternativo
            'http://localhost:3001',      // Mismo host que el backend
            'http://127.0.0.1:3001',      // Variante loopback
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

app.use(cors(corsOptions)); // Habilitar CORS con configuración restringida
app.use(express.json({ limit: '50mb' })); // Aumentar límite para archivos
app.use(express.static(path.join(__dirname, 'App'))); // Servir archivos estáticos

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

// Configuración de IA - API keys desde variables de entorno
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

// Validar que la API key de OpenAI esté configurada
if (!isTestEnv && !isDemoMode && !AI_CONFIG.openai.apiKey) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY no está configurada. Las funcionalidades de IA no estarán disponibles.');
    console.warn('   Agrega OPENAI_API_KEY a tu archivo .env para habilitar IA.');
}

// ============================================
// FUNCIONES DE VALIDACIÓN Y NORMALIZACIÓN (Reglas 1-20)
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

// REGLA 1: Prioridad columnas > metadata
// REGLA 3: Normalizar valores de entrada
// REGLA 4: Validar campos clave
function extractAndNormalizeColumns(rawData, existingData = null) {
    const errors = {};
    const warnings = [];
    const conflicts = [];

    // Parsear metadata si viene como string
    const incomingMetadata = parseMetadata(rawData.metadata);
    if (rawData.metadata && !incomingMetadata) {
        errors.metadata = 'metadata debe ser un objeto JSON válido';
    }

    // PRIORIDAD: columnas directas > metadata
    // Solo usar metadata para completar faltantes

    // Email: priorizar columna directa
    let email = rawData.email || (incomingMetadata && incomingMetadata.email) || null;
    email = normalizeEmail(email);
    if (email && !validateEmail(email)) {
        errors.email = 'Formato de email inválido';
    }

    // Detectar conflicto entre columna y metadata
    if (rawData.email && incomingMetadata && incomingMetadata.email &&
        normalizeEmail(rawData.email) !== normalizeEmail(incomingMetadata.email)) {
        conflicts.push({
            field: 'email',
            column_value: normalizeEmail(rawData.email),
            metadata_value: normalizeEmail(incomingMetadata.email),
            resolution: 'Se usó el valor de la columna'
        });
    }

    // Phone: priorizar columna directa
    let phone = rawData.phone || (incomingMetadata && incomingMetadata.phone) || null;
    phone = normalizePhone(phone);
    if (phone && !validatePhone(phone)) {
        errors.phone = 'Formato de teléfono inválido (debe tener entre 7 y 20 dígitos)';
    }

    // Detectar conflicto phone
    if (rawData.phone && incomingMetadata && incomingMetadata.phone &&
        normalizePhone(rawData.phone) !== normalizePhone(incomingMetadata.phone)) {
        conflicts.push({
            field: 'phone',
            column_value: normalizePhone(rawData.phone),
            metadata_value: normalizePhone(incomingMetadata.phone),
            resolution: 'Se usó el valor de la columna'
        });
    }

    // Country: priorizar columna directa
    const country = sanitizeAndTruncate(
        rawData.country || (incomingMetadata && incomingMetadata.country) || null,
        100
    );

    // Address: priorizar columna directa
    const address = sanitizeAndTruncate(
        rawData.address || (incomingMetadata && incomingMetadata.address) || null,
        1024
    );

    // Encargado: priorizar columna directa
    const encargado = sanitizeAndTruncate(
        rawData.encargado || (incomingMetadata && incomingMetadata.encargado) || null,
        255
    );

    // is_group: priorizar columna directa, normalizar a boolean
    const isGroup = normalizeBoolean(
        rawData.is_group !== undefined ? rawData.is_group :
            (incomingMetadata && incomingMetadata.es_grupo)
    );

    // relationship_type: priorizar columna directa, validar
    let relationshipType = rawData.relationship_type ||
        (incomingMetadata && incomingMetadata.relationship_type) ||
        'none';
    relationshipType = normalizeRelationshipType(relationshipType, isGroup);
    if (!validateRelationshipType(relationshipType)) {
        errors.relationship_type = 'relationship_type debe ser "parent", "child" o "none"';
    }

    // Campos de texto: sanitizar y truncar
    const name = sanitizeAndTruncate(rawData.name, 255);
    const entityId = sanitizeAndTruncate(rawData.entity_id, 100);
    const description = sanitizeAndTruncate(rawData.description, 1024);

    if (!name || name.length === 0) {
        errors.name = 'El nombre es requerido';
    }

    if (!entityId || entityId.length === 0) {
        errors.entity_id = 'El ID de entidad es requerido';
    }

    // Retornar resultado
    return {
        valid: Object.keys(errors).length === 0,
        errors,
        conflicts,
        warnings,
        columns: {
            name,
            entity_id: entityId,
            description: description || '',
            status: rawData.status || 'activa',
            country,
            address,
            email,
            phone,
            encargado,
            is_group: isGroup,
            relationship_type: relationshipType
        },
        incomingMetadata
    };
}

// REGLA 6: Construir partialMeta desde columnas finales
function buildPartialMetaFromColumns(columns) {
    return {
        country: columns.country,
        address: columns.address,
        email: columns.email,
        phone: columns.phone,
        encargado: columns.encargado,
        es_grupo: columns.is_group,
        relationship_type: columns.relationship_type
    };
}

// REGLA 7: Mergear metadata de forma segura
// REGLA 5: No sobrescribir columnas existentes por defecto (COALESCE-style)
function mergeMetadata(incomingMetadata, partialMeta, forceOverwrite = false) {
    // Si no hay metadata entrante, usar solo partialMeta
    if (!incomingMetadata) {
        return partialMeta;
    }

    // Merge: partialMeta (desde columnas) tiene prioridad sobre claves de columna
    // Pero preservamos claves adicionales de incomingMetadata
    const merged = { ...incomingMetadata };

    // Sobrescribir claves de columna con partialMeta
    Object.keys(partialMeta).forEach(key => {
        merged[key] = partialMeta[key];
    });

    return merged;
}

// REGLA 5: Usar COALESCE-style para no sobrescribir valores existentes
// (a menos que se especifique force_overwrite)
function mergeWithExistingData(newColumns, existingData, forceOverwrite = false) {
    if (!existingData || forceOverwrite) {
        return newColumns;
    }

    // COALESCE: mantener valores existentes si los nuevos son null/undefined
    const merged = {};
    Object.keys(newColumns).forEach(key => {
        // Si el nuevo valor es null o undefined, mantener el existente
        if (newColumns[key] === null || newColumns[key] === undefined) {
            merged[key] = existingData[key] !== undefined ? existingData[key] : newColumns[key];
        } else {
            merged[key] = newColumns[key];
        }
    });

    return merged;
}

// REGLA 8: Operación atómica
// REGLA 1-7: Procesar y validar datos de entidad con todas las reglas
function processEntityData(rawData, existingData = null, options = {}) {
    const { forceOverwrite = false, forceFromMetadata = false } = options;

    // Extraer y normalizar columnas (reglas 1-4)
    const extracted = extractAndNormalizeColumns(rawData, existingData);

    if (!extracted.valid) {
        return {
            valid: false,
            errors: extracted.errors
        };
    }

    // Aplicar COALESCE-style si hay datos existentes (regla 5)
    const finalColumns = mergeWithExistingData(
        extracted.columns,
        existingData,
        forceOverwrite
    );

    // Construir partialMeta desde columnas finales (regla 6)
    const partialMeta = buildPartialMetaFromColumns(finalColumns);

    // Mergear metadata de forma segura (regla 7)
    const finalMetadata = mergeMetadata(extracted.incomingMetadata, partialMeta, forceOverwrite);

    // Construir objeto final
    const finalData = {
        ...finalColumns,
        metadata: finalMetadata
    };

    return {
        valid: true,
        data: finalData,
        conflicts: extracted.conflicts,
        warnings: extracted.warnings
    };
}

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

// Endpoint para procesar archivos y hacer consultas IA
app.post('/api/ai/process-files', upload.array('files', 5), async (req, res) => {
    try {
        const { prompt, context = 'soporte' } = req.body;
        const files = req.files || [];

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt es requerido' });
        }

        // Verificar si la API key está configurada
        if (!AI_CONFIG.openai.apiKey || AI_CONFIG.openai.apiKey === 'tu_api_key_aqui') {
            return res.status(503).json({
                error: 'Servicio no disponible',
                message: '🔑 API de OpenAI no configurada. Para usar las funcionalidades de IA:\n\n' +
                    '1. Obtén tu API key en: https://platform.openai.com/api-keys\n' +
                    '2. Edita el archivo .env y reemplaza OPENAI_API_KEY\n' +
                    '3. Reinicia el servidor\n\n' +
                    '📖 Ver guía: CONFIGURAR_API_KEY.md',
                needsConfiguration: true
            });
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

        // Verificar si la API key está configurada
        if (!AI_CONFIG.openai.apiKey || AI_CONFIG.openai.apiKey === 'tu_api_key_aqui') {
            return res.status(503).json({
                error: 'Servicio no disponible',
                message: '🔑 API de OpenAI no configurada. Para usar las funcionalidades de IA:\n\n' +
                    '1. Obtén tu API key en: https://platform.openai.com/api-keys\n' +
                    '2. Edita el archivo .env y reemplaza OPENAI_API_KEY\n' +
                    '3. Reinicia el servidor\n\n' +
                    '📖 Ver guía: CONFIGURAR_API_KEY.md',
                needsConfiguration: true
            });
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

        // Mensajes de error más específicos
        let userMessage = 'Lo siento, hubo un error al procesar tu consulta con la IA.';

        if (error.message.includes('401')) {
            userMessage = '🔑 Error de autenticación: Tu API key de OpenAI es inválida o ha expirado.\n\n' +
                'Por favor, verifica tu API key en el archivo .env o genera una nueva en:\n' +
                'https://platform.openai.com/api-keys';
        } else if (error.message.includes('429')) {
            userMessage = '⏱️ Límite de uso excedido: Has alcanzado tu cuota de OpenAI.\n\n' +
                'Opciones:\n' +
                '• Espera unos minutos antes de reintentar\n' +
                '• Revisa tu uso en: https://platform.openai.com/account/usage\n' +
                '• Considera actualizar tu plan';
        } else if (error.message.includes('insufficient_quota')) {
            userMessage = '💳 Sin créditos: Tu cuenta de OpenAI no tiene saldo suficiente.\n\n' +
                'Necesitas agregar créditos en:\n' +
                'https://platform.openai.com/account/billing/overview';
        }

        res.status(500).json({
            error: 'Error al procesar consulta IA',
            message: userMessage
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

// ============================================
// ENDPOINTS DE AUTENTICACIÓN
// ============================================

// Endpoint de login deshabilitado: la autenticación se realiza únicamente via Supabase Auth desde el frontend
app.post('/api/auth/login', (_req, res) => {
    return res.status(410).json({
        success: false,
        error: 'Autenticación movida a Supabase Auth. Usa supabase.auth.signInWithPassword desde el frontend.'
    });
});

// ============================================
// ENDPOINTS DE BASE DE DATOS (SUPABASE)
// ============================================

// Endpoint para obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        // Modo demo: devolver usuarios de demo
        if (isDemoMode) {
            const demoUsers = [
                {
                    id: 'demo-admin-1',
                    username: 'admin',
                    email: 'admin@cfinsight.com',
                    role: 'admin',
                    name: 'Administrador',
                    phone: '+52 55 1234 5678',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'demo-auditor-1',
                    username: 'auditor',
                    email: 'auditor@cfinsight.com',
                    role: 'auditor',
                    name: 'Auditor Demo',
                    phone: '+52 55 8765 4321',
                    created_at: new Date().toISOString()
                }
            ];

            console.log('Returning demo users');
            res.json({ success: true, data: demoUsers });
            return;
        }

        // Logging de diagnóstico
        console.log('Environment check: SUPABASE_URL =', process.env.SUPABASE_URL);
        console.log('SUPABASE_SERVICE_ROLE_KEY set =', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.log('supabase client =', supabase ? 'initialized' : 'null');

        if (!supabase) {
            console.error('Supabase client not initialized');
            return res.status(500).json({ success: false, error: 'Supabase client not initialized' });
        }

        console.log('Querying users table from Supabase');
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }

        console.log('Query successful, returning', data ? data.length : 0, 'users');
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        if (error && error.stack) console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            stack: error.stack
        });
    }
});

// Endpoint para obtener usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para crear usuario
app.post('/api/usuarios', async (req, res) => {
    try {
        const userData = req.body;
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar usuario
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userData = req.body;
        const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para eliminar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener todas las entidades
app.get('/api/entities', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo entidades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener entidad por ID
app.get('/api/entities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo entidad:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para crear entidad (con validación mejorada - Reglas 1-20)
app.post('/api/entities', async (req, res) => {
    try {
        console.log('📥 Recibiendo datos de nueva entidad:', JSON.stringify(req.body, null, 2));

        // REGLA 13: Flag opcional force_overwrite
        const forceOverwrite = req.body.force_overwrite === true;
        const forceFromMetadata = req.body.force_from_metadata === true;

        // REGLA 1-8: Procesar y validar datos
        const result = processEntityData(req.body, null, { forceOverwrite, forceFromMetadata });

        // REGLA 9: Devolver 400 con errores por campo
        if (!result.valid) {
            console.error('❌ Validación fallida:', result.errors);
            // REGLA 16: Logging mínimo para fallos de validación
            console.warn('⚠️  Intento de creación fallido:', {
                timestamp: new Date().toISOString(),
                errors: result.errors,
                payload_keys: Object.keys(req.body)
            });

            return res.status(400).json({
                success: false,
                error: 'validation_error',
                message: 'Los datos proporcionados no son válidos',
                fields: result.errors,
                // REGLA 16: Proveer ejemplos
                example: {
                    name: "Dirección General de Finanzas",
                    entity_id: "DGF-001",
                    email: "contacto@dgf.com",
                    phone: "+52 55 1234 5678",
                    country: "México",
                    address: "Av. Principal 123",
                    is_group: false,
                    relationship_type: "none"
                }
            });
        }

        const entityData = result.data;
        console.log('✅ Datos procesados y validados:', JSON.stringify(entityData, null, 2));

        // REGLA 12: Señalar conflictos entre column vs metadata
        if (result.conflicts && result.conflicts.length > 0) {
            console.warn('⚠️  Conflictos detectados entre columnas y metadata:', result.conflicts);
        }

        // REGLA 8: Insertar en Supabase (operación atómica)
        // REGLA 10: Usar service_role para operaciones de mantenimiento
        const { data, error } = await supabase
            .from('entities')
            .insert([entityData])
            .select()
            .single();

        // REGLA 9: En fallo DB devolver 500 y loguear detalle
        if (error) {
            console.error('❌ Error de Supabase:', {
                timestamp: new Date().toISOString(),
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });

            return res.status(500).json({
                success: false,
                error: 'database_error',
                message: 'Error al guardar la entidad en la base de datos',
                // No exponer detalles internos al cliente
                debug: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        console.log('✅ Entidad creada exitosamente:', data.id);

        // Respuesta exitosa con información adicional
        const response = {
            success: true,
            data,
            message: 'Entidad creada exitosamente'
        };

        // REGLA 12: Incluir conflictos en la respuesta
        if (result.conflicts && result.conflicts.length > 0) {
            response.conflicts = result.conflicts;
            response.warning = 'Se detectaron conflictos entre valores de columnas y metadata. Se priorizaron los valores de columnas.';
        }

        res.json(response);
    } catch (error) {
        console.error('❌ Error inesperado creando entidad:', {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            error: 'internal_error',
            message: 'Error interno del servidor'
        });
    }
});

// Endpoint para actualizar entidad (con validación mejorada - Reglas 1-20)
app.put('/api/entities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📝 Actualizando entidad ID ${id}:`, JSON.stringify(req.body, null, 2));

        // REGLA 5: Obtener datos existentes primero para COALESCE-style
        const { data: existingEntity, error: fetchError } = await supabase
            .from('entities')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'not_found',
                    message: `No se encontró entidad con ID ${id}`
                });
            }
            throw fetchError;
        }

        console.log('📋 Datos existentes:', JSON.stringify(existingEntity, null, 2));

        // REGLA 13: Flags opcionales force_overwrite / force_from_metadata
        const forceOverwrite = req.body.force_overwrite === true;
        const forceFromMetadata = req.body.force_from_metadata === true;

        // REGLA 1-8: Procesar y validar datos con COALESCE-style
        const result = processEntityData(req.body, existingEntity, { forceOverwrite, forceFromMetadata });

        // REGLA 9: Devolver 400 con errores por campo
        if (!result.valid) {
            console.error('❌ Validación fallida:', result.errors);
            // REGLA 16: Logging mínimo para fallos de validación
            console.warn('⚠️  Intento de actualización fallido:', {
                timestamp: new Date().toISOString(),
                entity_id: id,
                errors: result.errors,
                payload_keys: Object.keys(req.body)
            });

            return res.status(400).json({
                success: false,
                error: 'validation_error',
                message: 'Los datos proporcionados no son válidos',
                fields: result.errors,
                // REGLA 16: Proveer ejemplos
                example: {
                    email: "nuevo@ejemplo.com",
                    phone: "+52 55 9876 5432",
                    force_overwrite: false  // Opcional: forzar sobrescritura
                }
            });
        }

        const entityData = result.data;
        console.log('✅ Datos procesados y validados:', JSON.stringify(entityData, null, 2));

        // REGLA 12: Señalar conflictos entre column vs metadata
        if (result.conflicts && result.conflicts.length > 0) {
            console.warn('⚠️  Conflictos detectados entre columnas y metadata:', result.conflicts);
        }

        // REGLA 8: Actualizar en Supabase (operación atómica)
        // REGLA 10: Usar service_role para operaciones de mantenimiento
        const { data, error } = await supabase
            .from('entities')
            .update(entityData)
            .eq('id', id)
            .select()
            .single();

        // REGLA 9: En fallo DB devolver 500 y loguear detalle
        if (error) {
            console.error('❌ Error de Supabase:', {
                timestamp: new Date().toISOString(),
                entity_id: id,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });

            return res.status(500).json({
                success: false,
                error: 'database_error',
                message: 'Error al actualizar la entidad en la base de datos',
                debug: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        console.log('✅ Entidad actualizada exitosamente:', data.id);

        // REGLA 11: Registrar auditoría (opcional)
        if (process.env.ENABLE_AUDIT_LOG === 'true') {
            try {
                await supabase.from('audit_logs').insert([{
                    user_id: req.user?.id || 'system',
                    action: 'update_entity',
                    entity_type: 'entities',
                    entity_id: id,
                    changes: {
                        before: existingEntity,
                        after: data
                    },
                    timestamp: new Date().toISOString()
                }]);
            } catch (auditError) {
                console.warn('⚠️  No se pudo registrar auditoría:', auditError.message);
                // No fallar la operación principal por error de auditoría
            }
        }

        // Respuesta exitosa con información adicional
        const response = {
            success: true,
            data,
            message: 'Entidad actualizada exitosamente'
        };

        // REGLA 12: Incluir conflictos en la respuesta
        if (result.conflicts && result.conflicts.length > 0) {
            response.conflicts = result.conflicts;
            response.warning = 'Se detectaron conflictos entre valores de columnas y metadata. Se priorizaron los valores de columnas.';
        }

        res.json(response);
    } catch (error) {
        console.error('❌ Error inesperado actualizando entidad:', {
            timestamp: new Date().toISOString(),
            entity_id: req.params.id,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            error: 'internal_error',
            message: 'Error interno del servidor'
        });
    }
});

// Endpoint para eliminar entidad
app.delete('/api/entities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('entities')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Entidad eliminada' });
    } catch (error) {
        console.error('Error eliminando entidad:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener todos los compromisos
app.get('/api/commitments', async (req, res) => {
    try {
        // Modo demo: devolver compromisos de demo
        if (isDemoMode) {
            const demoCommitments = [
                {
                    id: 'demo-commitment-1',
                    name: 'Auditoría de Procesos Financieros',
                    description: 'Revisión completa de los procesos financieros y controles internos',
                    status: 'activo',
                    start_date: '2024-01-15',
                    end_date: '2024-03-15',
                    entity_id: 1,
                    created_at: new Date().toISOString(),
                    entities: {
                        id: 1,
                        name: 'Dirección General de Finanzas',
                        entity_id: 'DGF-001'
                    }
                },
                {
                    id: 'demo-commitment-2',
                    name: 'Evaluación de Riesgos Operativos',
                    description: 'Análisis de riesgos operativos en el área de producción',
                    status: 'pendiente',
                    start_date: '2024-02-01',
                    end_date: '2024-04-01',
                    entity_id: 2,
                    created_at: new Date().toISOString(),
                    entities: {
                        id: 2,
                        name: 'Gerencia de Producción',
                        entity_id: 'GP-002'
                    }
                },
                {
                    id: 'demo-commitment-3',
                    name: 'Auditoría de Sistemas de Información',
                    description: 'Evaluación de controles de seguridad en sistemas informáticos',
                    status: 'completado',
                    start_date: '2023-11-01',
                    end_date: '2024-01-31',
                    entity_id: 3,
                    created_at: new Date().toISOString(),
                    entities: {
                        id: 3,
                        name: 'Dirección de Tecnologías de la Información',
                        entity_id: 'DTI-003'
                    }
                }
            ];

            console.log('Returning demo commitments');
            res.json({ success: true, data: demoCommitments });
            return;
        }

        if (!supabase) {
            console.error('Supabase client not initialized');
            return res.status(500).json({ success: false, error: 'Servicio de base de datos no disponible' });
        }

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
        console.error('Error obteniendo compromisos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener compromiso por ID
app.get('/api/commitments/:id', async (req, res) => {
    try {
        const { id } = req.params;
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

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo compromiso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener compromisos por entidad
app.get('/api/commitments/entity/:entityId', async (req, res) => {
    try {
        const { entityId } = req.params;
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
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo compromisos por entidad:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para crear compromiso (con validación)
app.post('/api/commitments', validate('commitment', 'create'), async (req, res) => {
    try {
        // req.body ya está validado y sanitizado por el middleware
        const commitmentData = req.body;
        const { data, error } = await supabase
            .from('commitments')
            .insert([commitmentData])
            .select(`
                *,
                entities (
                    id,
                    name,
                    entity_id
                )
            `)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creando compromiso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar compromiso (con validación)
app.put('/api/commitments/:id', validate('commitment', 'update'), async (req, res) => {
    try {
        const { id } = req.params;
        const commitmentData = req.body;
        const { data, error } = await supabase
            .from('commitments')
            .update(commitmentData)
            .eq('id', id)
            .select(`
                *,
                entities (
                    id,
                    name,
                    entity_id
                )
            `)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error actualizando compromiso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para eliminar compromiso
app.delete('/api/commitments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('commitments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Compromiso eliminado' });
    } catch (error) {
        console.error('Error eliminando compromiso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener todos los equipos de trabajo
app.get('/api/work-groups', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('work_groups')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo equipos de trabajo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener grupo por ID
app.get('/api/work-groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('work_groups')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo grupo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para crear grupo
app.post('/api/work-groups', async (req, res) => {
    try {
        const groupData = {
            name: req.body.name,
            description: req.body.description || '',
            members: req.body.members || [],
            commitments: req.body.commitments || []
        };

        console.log('📥 Creando equipo de trabajo:', JSON.stringify(groupData, null, 2));

        const { data, error } = await supabase
            .from('work_groups')
            .insert([groupData])
            .select()
            .single();

        if (error) {
            console.error('❌ Error de Supabase:', error);
            throw error;
        }

        console.log('✅ Equipo creado exitosamente:', data.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error creando equipo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar grupo
app.put('/api/work-groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const groupData = {
            name: req.body.name,
            description: req.body.description || '',
            members: req.body.members || [],
            commitments: req.body.commitments || []
        };

        console.log(`📝 Actualizando equipo de trabajo ${id}:`, JSON.stringify(groupData, null, 2));

        const { data, error } = await supabase
            .from('work_groups')
            .update(groupData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error de Supabase:', error);
            throw error;
        }

        console.log('✅ Equipo actualizado exitosamente:', data.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error actualizando equipo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para eliminar grupo
app.delete('/api/work-groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('work_groups')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Grupo eliminado' });
    } catch (error) {
        console.error('Error eliminando grupo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener registros (logs)
app.get('/api/records', async (req, res) => {
    try {
        const { limit = 100, offset = 0, username, action } = req.query;

        let query = supabase
            .from('records')
            .select('*')
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);

        if (username) {
            query = query.eq('username', username);
        }

        if (action) {
            query = query.eq('action', action);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo registros:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener registro por ID
app.get('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('records')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo registro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener registros por rango de fechas
app.get('/api/records/range/:startDate/:endDate', async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const { data, error } = await supabase
            .from('records')
            .select('*')
            .gte('timestamp', startDate)
            .lte('timestamp', endDate)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo registros por fecha:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para crear registro
app.post('/api/records', async (req, res) => {
    try {
        const recordData = req.body;
        const { data, error } = await supabase
            .from('records')
            .insert([recordData])
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creando registro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para eliminar registro
app.delete('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('records')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Registro eliminado' });
    } catch (error) {
        console.error('Error eliminando registro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener formularios de auditoría por tipo
app.get('/api/audit/forms/:formType', async (req, res) => {
    try {
        const { formType } = req.params;
        const { commitment_id } = req.query;
        // Obtener usuario actual de la sesión (permitir null)
        const userId = req.headers['user-id'] || null;

        if (!commitment_id) {
            return res.status(400).json({ success: false, error: 'commitment_id es requerido' });
        }

        // Construir query con el mismo filtro que POST
        const query = supabase
            .from('audit_forms')
            .select('*')
            .eq('form_type', formType)
            .eq('commitment_id', commitment_id);

        // Solo filtrar por user_id si existe, sino buscar los que tienen user_id = null
        if (userId) {
            query.eq('user_id', userId);
        } else {
            query.is('user_id', null);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo formulario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para guardar formulario de auditoría
app.post('/api/audit/forms', async (req, res) => {
    try {
        const { formType, commitmentId, data: formData } = req.body;
        let userId = req.headers['user-id'] || null;

        if (!commitmentId) {
            return res.status(400).json({ success: false, error: 'commitmentId es requerido' });
        }

        // VALIDAR que el user_id exista en la tabla users si no es null
        if (userId) {
            const { data: userExists } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();

            // Si el usuario no existe, forzar a null para evitar error de FK
            if (!userExists) {
                console.warn(`⚠️ User ID ${userId} no existe en users, guardando como NULL`);
                userId = null;
            }
        }

        // Verificar si ya existe (buscar por form_type y commitment_id solamente)
        const query = supabase
            .from('audit_forms')
            .select('id')
            .eq('form_type', formType)
            .eq('commitment_id', commitmentId);

        // Solo filtrar por user_id si existe
        if (userId) {
            query.eq('user_id', userId);
        } else {
            query.is('user_id', null);
        }

        const { data: existing } = await query.single();

        let result;
        if (existing) {
            // Actualizar
            const { data, error } = await supabase
                .from('audit_forms')
                .update({ data: formData, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Crear nuevo
            const { data, error } = await supabase
                .from('audit_forms')
                .insert([{
                    form_type: formType,
                    user_id: userId,
                    commitment_id: commitmentId,
                    data: formData
                }])
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error guardando formulario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener revisiones de formulario
app.get('/api/audit/reviews/:formId', async (req, res) => {
    try {
        const { formId } = req.params;
        const { data, error } = await supabase
            .from('audit_reviews')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo revisiones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar revisión
app.post('/api/audit/reviews', async (req, res) => {
    try {
        const { formId, questionId, reviewed } = req.body;
        const reviewedBy = req.headers['user-id'] || 'default_user';

        // Verificar si ya existe
        const { data: existing } = await supabase
            .from('audit_reviews')
            .select('id')
            .eq('form_id', formId)
            .eq('question_id', questionId)
            .single();

        let result;
        if (existing) {
            // Actualizar
            const { data, error } = await supabase
                .from('audit_reviews')
                .update({
                    reviewed,
                    reviewed_by: reviewed ? reviewedBy : null,
                    reviewed_at: reviewed ? new Date().toISOString() : null
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Crear nuevo
            const { data, error } = await supabase
                .from('audit_reviews')
                .insert([{
                    form_id: formId,
                    question_id: questionId,
                    reviewed,
                    reviewed_by: reviewed ? reviewedBy : null,
                    reviewed_at: reviewed ? new Date().toISOString() : null
                }])
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error actualizando revisión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AUDIT FINAL REVIEWS API ENDPOINTS (SOCIO)
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

// Obtener formularios pendientes de revisión final
app.get('/api/audit/final-reviews/pending', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('audit_forms')
            .select(`
                id,
                form_type,
                user_id,
                commitment_id,
                final_review_status,
                requires_final_review,
                created_at,
                updated_at,
                commitments (
                    id,
                    name,
                    description,
                    status
                )
            `)
            .eq('requires_final_review', true)
            .in('final_review_status', ['pendiente', 'en_revision'])
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo formularios pendientes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener todas las revisiones finales de un formulario
app.get('/api/audit/final-reviews/:formId', async (req, res) => {
    try {
        const { formId } = req.params;
        const { data, error } = await supabase
            .from('audit_final_reviews')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo revisiones finales:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener vista completa de formulario con revisión final
app.get('/api/audit/forms/:formId/with-final-review', async (req, res) => {
    try {
        const { formId } = req.params;
        const { data, error } = await supabase
            .from('v_audit_forms_with_final_review')
            .select('*')
            .eq('form_id', formId)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo formulario con revisión final:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear o actualizar revisión final (solo socios y admins)
app.post('/api/audit/final-reviews', isSocioOrAdmin, async (req, res) => {
    try {
        const { formId, commitmentId, reviewedBy, reviewStatus, comments, observations } = req.body;

        if (!formId || !commitmentId || !reviewedBy || !reviewStatus) {
            return res.status(400).json({
                success: false,
                error: 'formId, commitmentId, reviewedBy y reviewStatus son requeridos'
            });
        }

        // Validar estados permitidos
        const validStatuses = ['pendiente', 'en_revision', 'aprobado', 'rechazado', 'con_observaciones'];
        if (!validStatuses.includes(reviewStatus)) {
            return res.status(400).json({
                success: false,
                error: `reviewStatus debe ser uno de: ${validStatuses.join(', ')}`
            });
        }

        // Verificar si ya existe una revisión final de este socio para este formulario
        const { data: existing } = await supabase
            .from('audit_final_reviews')
            .select('id')
            .eq('form_id', formId)
            .eq('reviewed_by', reviewedBy)
            .single();

        let result;
        if (existing) {
            // Actualizar revisión existente
            const updateData = {
                review_status: reviewStatus,
                comments: comments || null,
                observations: observations || {},
                updated_at: new Date().toISOString()
            };

            if (reviewStatus === 'aprobado') {
                updateData.approved_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('audit_final_reviews')
                .update(updateData)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Crear nueva revisión final
            const insertData = {
                form_id: formId,
                commitment_id: commitmentId,
                reviewed_by: reviewedBy,
                review_status: reviewStatus,
                comments: comments || null,
                observations: observations || {}
            };

            if (reviewStatus === 'aprobado') {
                insertData.approved_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('audit_final_reviews')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        // Actualizar estado del formulario
        await supabase
            .from('audit_forms')
            .update({
                final_review_status: reviewStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', formId);

        res.json({
            success: true,
            data: result,
            message: existing ? 'Revisión final actualizada' : 'Revisión final creada'
        });
    } catch (error) {
        console.error('Error guardando revisión final:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Marcar formulario como requiere revisión final
app.patch('/api/audit/forms/:formId/require-final-review', isSocioOrAdmin, async (req, res) => {
    try {
        const { formId } = req.params;
        const { requiresFinalReview } = req.body;

        if (requiresFinalReview === undefined) {
            return res.status(400).json({
                success: false,
                error: 'requiresFinalReview es requerido'
            });
        }

        const updateData = {
            requires_final_review: requiresFinalReview,
            updated_at: new Date().toISOString()
        };

        // Si se marca como requiere revisión final, cambiar el estado a pendiente
        if (requiresFinalReview) {
            updateData.final_review_status = 'pendiente';
        } else {
            updateData.final_review_status = 'no_requerido';
        }

        const { data, error } = await supabase
            .from('audit_forms')
            .update(updateData)
            .eq('id', formId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data,
            message: requiresFinalReview
                ? 'Formulario marcado como requiere revisión final'
                : 'Revisión final removida del formulario'
        });
    } catch (error) {
        console.error('Error actualizando requisito de revisión final:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estadísticas de revisiones finales (para dashboard de socios)
app.get('/api/audit/final-reviews/stats/:reviewedBy', isSocioOrAdmin, async (req, res) => {
    try {
        const { reviewedBy } = req.params;

        // Obtener conteos por estado
        const { data: stats, error } = await supabase
            .from('audit_final_reviews')
            .select('review_status')
            .eq('reviewed_by', reviewedBy);

        if (error) throw error;

        // Contar por estado
        const statusCounts = {
            total: stats.length,
            en_revision: stats.filter(r => r.review_status === 'en_revision').length,
            aprobado: stats.filter(r => r.review_status === 'aprobado').length,
            rechazado: stats.filter(r => r.review_status === 'rechazado').length,
            con_observaciones: stats.filter(r => r.review_status === 'con_observaciones').length
        };

        // Obtener pendientes
        const { data: pending, error: pendingError } = await supabase
            .from('audit_forms')
            .select('id')
            .eq('requires_final_review', true)
            .in('final_review_status', ['pendiente', 'en_revision']);

        if (pendingError) throw pendingError;

        res.json({
            success: true,
            data: {
                ...statusCounts,
                pendientes: pending.length
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DOCUMENTOS DE AUDITORÍA
// ============================================

// Subir documento (asociado a formulario o compromiso)
app.post('/api/audit/documents/upload', upload.single('document'), async (req, res) => {
    try {
        const { form_id, commitment_id, description, category, user_id } = req.body;
        const file = req.file;

        // Validaciones
        if (!file) {
            return res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' });
        }

        if (!commitment_id) {
            return res.status(400).json({ success: false, error: 'El commitment_id es requerido' });
        }

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'El user_id es requerido' });
        }

        // Generar nombre único para el archivo
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
        const filePath = `${commitment_id}/${fileName}`;

        // Subir archivo a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('audit-documents')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Error al subir archivo a Storage:', uploadError);
            return res.status(500).json({ success: false, error: `Error al subir archivo: ${uploadError.message}` });
        }

        // Obtener URL pública del archivo
        const { data: urlData } = supabase.storage
            .from('audit-documents')
            .getPublicUrl(filePath);

        // Guardar metadata en la base de datos
        const { data: documentData, error: dbError } = await supabase
            .from('audit_documents')
            .insert([{
                form_id: form_id || null,
                commitment_id: parseInt(commitment_id),
                document_name: file.originalname,
                document_url: urlData.publicUrl,
                document_type: file.mimetype,
                file_size: file.size,
                uploaded_by: user_id,
                description: description || null,
                category: category || 'planes_procedimientos'
            }])
            .select()
            .single();

        if (dbError) {
            console.error('Error al guardar metadata del documento:', dbError);
            // Intentar eliminar el archivo del storage si falló el guardado en BD
            await supabase.storage.from('audit-documents').remove([filePath]);
            return res.status(500).json({ success: false, error: `Error al guardar documento: ${dbError.message}` });
        }

        res.json({
            success: true,
            data: documentData,
            message: 'Documento subido exitosamente'
        });

    } catch (error) {
        console.error('Error al subir documento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener documentos por compromiso
app.get('/api/audit/documents/commitment/:commitmentId', async (req, res) => {
    try {
        const { commitmentId } = req.params;
        const { category } = req.query;

        let query = supabase
            .from('audit_documents')
            .select('*')
            .eq('commitment_id', commitmentId)
            .order('created_at', { ascending: false });

        // Filtrar por categoría si se proporciona
        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener documentos:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener documentos por formulario
app.get('/api/audit/documents/form/:formId', async (req, res) => {
    try {
        const { formId } = req.params;

        const { data, error } = await supabase
            .from('audit_documents')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener documentos:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Eliminar documento
app.delete('/api/audit/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const { user_id } = req.query;

        // Obtener información del documento
        const { data: document, error: fetchError } = await supabase
            .from('audit_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (fetchError || !document) {
            return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        }

        // Verificar permisos (solo el propietario puede eliminar)
        if (document.uploaded_by !== user_id) {
            return res.status(403).json({ success: false, error: 'No tienes permisos para eliminar este documento' });
        }

        // Extraer la ruta del archivo del URL
        const urlParts = document.document_url.split('/audit-documents/');
        const filePath = urlParts[1];

        // Eliminar archivo del storage
        const { error: storageError } = await supabase.storage
            .from('audit-documents')
            .remove([filePath]);

        if (storageError) {
            console.error('Error al eliminar archivo del storage:', storageError);
            // Continuar con la eliminación de la BD aunque falle el storage
        }

        // Eliminar registro de la base de datos
        const { error: dbError } = await supabase
            .from('audit_documents')
            .delete()
            .eq('id', documentId);

        if (dbError) {
            console.error('Error al eliminar documento de la BD:', dbError);
            return res.status(500).json({ success: false, error: dbError.message });
        }

        res.json({ success: true, message: 'Documento eliminado exitosamente' });

    } catch (error) {
        console.error('Error al eliminar documento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Descargar documento
app.get('/api/audit/documents/download/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;

        // Obtener información del documento
        const { data: document, error } = await supabase
            .from('audit_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (error || !document) {
            return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        }

        // Extraer la ruta del archivo del URL
        const urlParts = document.document_url.split('/audit-documents/');
        const filePath = urlParts[1];

        // Descargar archivo del storage
        const { data, error: downloadError } = await supabase.storage
            .from('audit-documents')
            .download(filePath);

        if (downloadError) {
            console.error('Error al descargar archivo:', downloadError);
            return res.status(500).json({ success: false, error: downloadError.message });
        }

        // Convertir a buffer
        const buffer = Buffer.from(await data.arrayBuffer());

        // Configurar headers para la descarga
        res.setHeader('Content-Type', document.document_type);
        res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
        res.setHeader('Content-Length', buffer.length);

        res.send(buffer);

    } catch (error) {
        console.error('Error al descargar documento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// BÚSQUEDA GLOBAL
// ============================================

// Endpoint para búsqueda global (full-text search)
app.get('/api/search', async (req, res) => {
    try {
        const { query, types } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'El término de búsqueda debe tener al menos 2 caracteres'
            });
        }

        const searchTerm = query.trim().toLowerCase();
        const results = {};
        const searchTypes = types ? types.split(',') : ['entities', 'commitments', 'users'];

        // Buscar en entidades
        if (searchTypes.includes('entities')) {
            const { data: entities, error: entitiesError } = await supabase
                .from('entities')
                .select('id, name, entity_id, description, status')
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,entity_id.ilike.%${searchTerm}%`)
                .limit(10);

            if (!entitiesError) {
                results.entities = entities || [];
            }
        }

        // Buscar en compromisos
        if (searchTypes.includes('commitments')) {
            const { data: commitments, error: commitmentsError } = await supabase
                .from('commitments')
                .select('id, title, description, status, deadline, entity_id')
                .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .limit(10);

            if (!commitmentsError) {
                results.commitments = commitments || [];
            }
        }

        // Buscar en usuarios
        if (searchTypes.includes('users')) {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, username, name, email, role')
                .or(`username.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
                .limit(10);

            if (!usersError) {
                // Ocultar información sensible
                results.users = (users || []).map(u => ({
                    id: u.id,
                    username: u.username,
                    name: u.name,
                    role: u.role
                }));
            }
        }

        res.json({
            success: true,
            data: results,
            query: searchTerm
        });
    } catch (error) {
        console.error('Error en búsqueda global:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// RATE LIMITING BÁSICO
// ============================================

// Almacenar contadores de requests por IP
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests por minuto

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

// Aplicar rate limiting a todas las rutas de API
app.use('/api/', rateLimiter);

// Limpiar contadores antiguos cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
        if (now > record.resetTime + RATE_LIMIT_WINDOW) {
            requestCounts.delete(ip);
        }
    }
}, 5 * 60 * 1000);

// Endpoint de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
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
    console.log(`🔧 Usando tabla 'users' en Supabase`);
    if (isDemoMode) {
        console.log(`⚠️  MODO DEMO ACTIVO - No se conectará a Supabase`);
    }
});

module.exports = app;
