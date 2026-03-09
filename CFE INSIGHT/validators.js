/**
 * CFE INSIGHT - Input Validation Schemas
 * Validación de datos de entrada para endpoints de la API
 */

// Validación simple sin librerías externas (para evitar dependencias adicionales)

// Helper functions
function isString(value) {
    return typeof value === 'string';
}

function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}

function isBoolean(value) {
    return typeof value === 'boolean';
}

function isArray(value) {
    return Array.isArray(value);
}

function isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>\"']/g, function (match) {
        const entities = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return entities[match];
    }).trim();
}

// Validation schemas
const schemas = {
    // User validation
    user: {
        create: (data) => {
            const errors = [];

            if (!data.username || !isString(data.username)) {
                errors.push('username es requerido y debe ser un string');
            } else if (data.username.length < 3 || data.username.length > 30) {
                errors.push('username debe tener entre 3 y 30 caracteres');
            } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
                errors.push('username solo puede contener letras, números y guión bajo');
            }

            if (!data.password || !isString(data.password)) {
                errors.push('password es requerido');
            } else if (data.password.length < 8) {
                errors.push('password debe tener al menos 8 caracteres');
            }

            if (!data.name || !isString(data.name)) {
                errors.push('name es requerido');
            } else if (data.name.trim().length < 2) {
                errors.push('name debe tener al menos 2 caracteres');
            }

            if (!data.email || !isEmail(data.email)) {
                errors.push('email es requerido y debe ser válido');
            }

            const validRoles = ['cliente', 'auditor', 'auditor_senior', 'supervisor', 'socio', 'administrador', 'programador'];
            if (!data.role || !validRoles.includes(data.role)) {
                errors.push(`role debe ser uno de: ${validRoles.join(', ')}`);
            }

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? {
                    username: sanitizeString(data.username).toLowerCase(),
                    password: data.password, // No sanitizar password, se hasheará
                    name: sanitizeString(data.name),
                    email: sanitizeString(data.email).toLowerCase(),
                    phone: data.phone ? sanitizeString(data.phone) : '',
                    role: data.role,
                    groups: isArray(data.groups) ? data.groups : []
                } : null
            };
        },

        update: (data) => {
            const errors = [];

            if (data.name !== undefined) {
                if (!isString(data.name) || data.name.trim().length < 2) {
                    errors.push('name debe tener al menos 2 caracteres');
                }
            }

            if (data.email !== undefined) {
                if (!isEmail(data.email)) {
                    errors.push('email debe ser válido');
                }
            }

            if (data.role !== undefined) {
                const validRoles = ['cliente', 'auditor', 'auditor_senior', 'supervisor', 'socio', 'administrador', 'programador'];
                if (!validRoles.includes(data.role)) {
                    errors.push(`role debe ser uno de: ${validRoles.join(', ')}`);
                }
            }

            const sanitized = {};
            if (data.name) sanitized.name = sanitizeString(data.name);
            if (data.email) sanitized.email = sanitizeString(data.email).toLowerCase();
            if (data.phone !== undefined) sanitized.phone = sanitizeString(data.phone);
            if (data.role) sanitized.role = data.role;
            if (data.groups !== undefined) sanitized.groups = isArray(data.groups) ? data.groups : [];

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? sanitized : null
            };
        }
    },

    // Entity validation
    entity: {
        create: (data) => {
            const errors = [];

            if (!data.name || !isString(data.name)) {
                errors.push('name es requerido');
            } else if (data.name.trim().length < 2 || data.name.length > 200) {
                errors.push('name debe tener entre 2 y 200 caracteres');
            }

            const validStatuses = ['Activa', 'Inactiva', 'activa', 'inactiva'];
            if (data.status && !validStatuses.includes(data.status)) {
                errors.push('status debe ser "Activa" o "Inactiva"');
            }

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? {
                    name: sanitizeString(data.name),
                    entity_id: data.entity_id ? sanitizeString(data.entity_id) : '',
                    description: data.description ? sanitizeString(data.description) : '',
                    status: data.status || 'Activa'
                } : null
            };
        },

        update: (data) => {
            const errors = [];

            if (data.name !== undefined) {
                if (!isString(data.name) || data.name.trim().length < 2 || data.name.length > 200) {
                    errors.push('name debe tener entre 2 y 200 caracteres');
                }
            }

            if (data.status !== undefined) {
                const validStatuses = ['Activa', 'Inactiva', 'activa', 'inactiva'];
                if (!validStatuses.includes(data.status)) {
                    errors.push('status debe ser "Activa" o "Inactiva"');
                }
            }

            const sanitized = {};
            if (data.name) sanitized.name = sanitizeString(data.name);
            if (data.entity_id !== undefined) sanitized.entity_id = sanitizeString(data.entity_id);
            if (data.description !== undefined) sanitized.description = sanitizeString(data.description);
            if (data.status) sanitized.status = data.status;

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? sanitized : null
            };
        }
    },

    // Commitment validation
    commitment: {
        create: (data) => {
            const errors = [];

            // Aceptar tanto 'name' como 'title' para compatibilidad
            const nameField = data.name || data.title;
            if (!nameField || !isString(nameField)) {
                errors.push('name es requerido');
            } else if (nameField.trim().length < 3) {
                errors.push('name debe tener al menos 3 caracteres');
            }

            if (!data.entity_id) {
                errors.push('entity_id es requerido');
            }

            // Validar estados según el esquema actual de la base de datos
            const validStatuses = ['activo', 'pendiente', 'completado', 'cancelado', 'en_progreso'];
            if (data.status && !validStatuses.includes(data.status)) {
                errors.push(`status debe ser uno de: ${validStatuses.join(', ')}`);
            }

            // Validar fechas si se proporcionan
            if (data.start_date && data.end_date) {
                const startDate = new Date(data.start_date);
                const endDate = new Date(data.end_date);
                if (endDate <= startDate) {
                    errors.push('end_date debe ser posterior a start_date');
                }
            }

            const sanitized = {
                name: sanitizeString(nameField),
                description: data.description ? sanitizeString(data.description) : '',
                entity_id: data.entity_id,
                status: data.status || 'pendiente',
                start_date: data.start_date || null,
                end_date: data.end_date || null,
                created_by: data.created_by || null
            };

            // Agregar work_group_id si se proporciona
            if (data.work_group_id !== undefined && data.work_group_id !== null) {
                sanitized.work_group_id = data.work_group_id;
            }

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? sanitized : null
            };
        },

        update: (data) => {
            const errors = [];

            // Aceptar tanto 'name' como 'title' para compatibilidad
            const nameField = data.name || data.title;
            if (nameField !== undefined) {
                if (!isString(nameField) || nameField.trim().length < 3) {
                    errors.push('name debe tener al menos 3 caracteres');
                }
            }

            if (data.status !== undefined) {
                const validStatuses = ['activo', 'pendiente', 'completado', 'cancelado', 'en_progreso'];
                if (!validStatuses.includes(data.status)) {
                    errors.push(`status debe ser uno de: ${validStatuses.join(', ')}`);
                }
            }

            // Validar fechas si se proporcionan
            if (data.start_date && data.end_date) {
                const startDate = new Date(data.start_date);
                const endDate = new Date(data.end_date);
                if (endDate <= startDate) {
                    errors.push('end_date debe ser posterior a start_date');
                }
            }

            const sanitized = {};
            if (nameField) sanitized.name = sanitizeString(nameField);
            if (data.description !== undefined) sanitized.description = sanitizeString(data.description);
            if (data.entity_id) sanitized.entity_id = data.entity_id;
            if (data.status) sanitized.status = data.status;
            if (data.start_date !== undefined) sanitized.start_date = data.start_date;
            if (data.end_date !== undefined) sanitized.end_date = data.end_date;
            if (data.created_by !== undefined) sanitized.created_by = data.created_by;
            if (data.work_group_id !== undefined) sanitized.work_group_id = data.work_group_id;

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? sanitized : null
            };
        }
    },

    // Work Group validation
    workGroup: {
        create: (data) => {
            const errors = [];

            if (!data.name || !isString(data.name)) {
                errors.push('name es requerido');
            } else if (data.name.trim().length < 2) {
                errors.push('name debe tener al menos 2 caracteres');
            }

            if (data.members && !isArray(data.members)) {
                errors.push('members debe ser un array');
            }

            if (data.commitments && !isArray(data.commitments)) {
                errors.push('commitments debe ser un array');
            }

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? {
                    name: sanitizeString(data.name),
                    description: data.description ? sanitizeString(data.description) : '',
                    members: isArray(data.members) ? data.members : [],
                    commitments: isArray(data.commitments) ? data.commitments : []
                } : null
            };
        },

        update: (data) => {
            const errors = [];

            if (data.name !== undefined) {
                if (!isString(data.name) || data.name.trim().length < 2) {
                    errors.push('name debe tener al menos 2 caracteres');
                }
            }

            if (data.members !== undefined && !isArray(data.members)) {
                errors.push('members debe ser un array');
            }

            if (data.commitments !== undefined && !isArray(data.commitments)) {
                errors.push('commitments debe ser un array');
            }

            const sanitized = {};
            if (data.name) sanitized.name = sanitizeString(data.name);
            if (data.description !== undefined) sanitized.description = sanitizeString(data.description);
            if (data.members) sanitized.members = data.members;
            if (data.commitments) sanitized.commitments = data.commitments;

            return {
                valid: errors.length === 0,
                errors,
                sanitized: errors.length === 0 ? sanitized : null
            };
        }
    }
};

// Middleware function para Express
function validate(schema, operation = 'create') {
    return (req, res, next) => {
        if (!schemas[schema] || !schemas[schema][operation]) {
            return res.status(500).json({
                success: false,
                error: 'Schema de validación no encontrado'
            });
        }

        const result = schemas[schema][operation](req.body);

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                error: 'Errores de validación',
                details: result.errors
            });
        }

        // Reemplazar req.body con datos sanitizados
        req.body = result.sanitized;
        next();
    };
}

module.exports = {
    schemas,
    validate
};
