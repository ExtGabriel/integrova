const DATABASE_API_BASE_URL = (window.API_BASE_URL)
    || (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.NEXT_PUBLIC_API_BASE_URL))
    || (typeof process !== 'undefined' && (process.env?.VITE_API_BASE_URL || process.env?.NEXT_PUBLIC_API_BASE_URL))
    || '';

// ============================================
// ACCOUNT ASSIGNMENTS
// ============================================

/**
 * Guarda una asignación de cuenta en la base de datos
 * @param {Object} assignmentData - Datos de la asignación
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveAccountAssignment(assignmentData) {
    try {
        console.log('=== INICIO saveAccountAssignment ===');
        console.log('assignmentData recibido:', assignmentData);
        
        const finalDatasetId = assignmentData.datasetId || currentDatasetId;
        const userId = getCurrentUserId();
        
        console.log('Valores finales:', {
            datasetId: finalDatasetId,
            accountId: assignmentData.accountId,
            groupContentId: assignmentData.groupContentId,
            userId: userId,
            currentDatasetId: currentDatasetId
        });
        
        const payload = {
            datasetId: finalDatasetId,
            accountId: assignmentData.accountId,
            groupContentId: assignmentData.groupContentId,
            parentAccountId: assignmentData.parentAccountId || null,
            position: assignmentData.position || 0,
            meta: assignmentData.meta || {}
        };
        
        console.log('Payload a enviar:', payload);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/assignments/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const result = await response.json();
        console.log('Response body:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando asignación');
        }

        console.log('Assignment saved successfully:', result.assignment);
        return result.assignment;

    } catch (error) {
        console.error('Error in saveAccountAssignment:', error);
        throw error;
    }
}

/**
 * Obtiene todas las asignaciones de un dataset
 * @param {string} datasetId - ID del dataset
 * @returns {Promise<Array>} Array de asignaciones
 */
async function getAccountAssignments(datasetId) {
    try {
        console.log('Loading assignments from database for dataset:', datasetId);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/assignments/${datasetId}`, {
            method: 'GET',
            headers: {
                'user-id': getCurrentUserId()
            }
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo asignaciones');
        }

        const assignments = (result.assignments || []).map(convertDatabaseAssignmentToLocalStorage);
        console.log('Assignments loaded:', assignments.length);
        return assignments;

    } catch (error) {
        console.error('Error in getAccountAssignments:', error);
        return [];
    }
}

/**
 * Elimina una asignación de la base de datos
 * @param {string} assignmentId - ID de la asignación
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
async function deleteAccountAssignment(assignmentId) {
    try {
        console.log('Deleting assignment:', assignmentId);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: {
                'user-id': getCurrentUserId()
            }
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error eliminando asignación');
        }

        console.log('Assignment deleted successfully');
        return true;

    } catch (error) {
        console.error('Error in deleteAccountAssignment:', error);
        throw error;
    }
}

// ============================================
// GRUPOS FINANCIEROS
// ============================================

/**
 * Guarda un grupo financiero en la base de datos
 * @param {Object} groupData - Datos del grupo financiero
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveFinancialGroup(groupData) {
    try {
        console.log('Saving financial group to database:', groupData);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/financial-groups/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': getCurrentUserId()
            },
            body: JSON.stringify({
                datasetId: groupData.datasetId || currentDatasetId,
                groupId: groupData.id,
                name: groupData.name,
                type: groupData.type || 'group',
                parentLabel: groupData.parentLabel || null,
                value: groupData.value || 0,
                meta: groupData.meta || null
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando grupo financiero');
        }

        console.log('Financial group saved successfully:', result.group);
        return result.group;

    } catch (error) {
        console.error('Error in saveFinancialGroup:', error);
        throw error;
    }
}

/**
 * Obtiene todos los grupos financieros de un dataset
 * @param {string} datasetId - ID del dataset
 * @returns {Promise<Array>} Array de grupos financieros
 */
async function getFinancialGroups(datasetId) {
    try {
        console.log('Loading financial groups from database for dataset:', datasetId);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/financial-groups/${datasetId}`, {
            method: 'GET',
            headers: {
                'user-id': getCurrentUserId()
            }
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo grupos financieros');
        }

        console.log('Financial groups loaded:', result.groups);
        return result.groups;

    } catch (error) {
        console.error('Error in getFinancialGroups:', error);
        return [];
    }
}

// ============================================
// CUENTAS CONTABLES
// ============================================

/**
 * Guarda una cuenta contable en la base de datos
 * @param {Object} accountData - Datos de la cuenta contable
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveAccount(accountData) {
    try {
        console.log('Saving account to database:', accountData);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/accounts/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': getCurrentUserId()
            },
            body: JSON.stringify({
                datasetId: accountData.datasetId || currentDatasetId,
                code: accountData.code,
                name: accountData.name,
                value: accountData.value || 0,
                currentYearValue: accountData.currentYearValue || 0,
                previousYearValue: accountData.previousYearValue || 0,
                debit: accountData.debit || 0,
                credit: accountData.credit || 0,
                meta: accountData.meta || null
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando cuenta contable');
        }

        console.log('Account saved successfully:', result.account);
        return result.account;

    } catch (error) {
        console.error('Error in saveAccount:', error);
        throw error;
    }
}

/**
 * Guarda múltiples cuentas contables en lote
 * @param {Array} accountsData - Array de datos de cuentas
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveAccountsBatch(accountsData) {
    try {
        console.log('Saving accounts batch to database:', accountsData.length, 'accounts');
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/accounts/batch-save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': getCurrentUserId()
            },
            body: JSON.stringify({
                datasetId: currentDatasetId,
                accounts: accountsData
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando cuentas en lote');
        }

        console.log('Accounts batch saved successfully:', result);
        return result;

    } catch (error) {
        console.error('Error in saveAccountsBatch:', error);
        throw error;
    }
}

// ============================================
// AJUSTES FINANCIEROS
// ============================================

/**
 * Guarda un ajuste financiero en la base de datos
 * @param {Object} adjustmentData - Datos del ajuste
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveFinancialAdjustment(adjustmentData) {
    try {
        console.log('Saving adjustment to database:', adjustmentData);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/adjustments/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': getCurrentUserId()
            },
            body: JSON.stringify({
                datasetId: adjustmentData.datasetId || currentDatasetId,
                accountId: adjustmentData.accountId || null,
                assignmentId: adjustmentData.assignmentId || null,
                adjustmentType: adjustmentData.adjustmentType || 'manual',
                moneda: adjustmentData.moneda || 'GTQ',
                monto: adjustmentData.monto,
                descripcion: adjustmentData.descripcion || null,
                htmlContenido: adjustmentData.htmlContenido || null,
                adjuntos: adjustmentData.adjuntos || null
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando ajuste');
        }

        console.log('Adjustment saved successfully:', result.adjustment);
        return result.adjustment;

    } catch (error) {
        console.error('Error in saveFinancialAdjustment:', error);
        throw error;
    }
}

/**
 * Guarda ajustes de cuentas desde la sección Cuentas en la base de datos
 * @param {string} datasetId - ID del dataset
 * @param {Map} adjustmentsMap - Mapa de ajustes locales (código -> valor)
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveAccountAdjustments(datasetId, adjustmentsMap) {
    try {
        console.log('Saving account adjustments to database:', { datasetId, adjustmentsCount: adjustmentsMap.size });
        
        if (!datasetId || !adjustmentsMap || adjustmentsMap.size === 0) {
            console.log('No adjustments to save');
            return { success: true, message: 'No adjustments to save' };
        }

        // Convertir el mapa a array para enviar a la API
        const adjustments = Array.from(adjustmentsMap.entries()).map(([accountKey, amount]) => ({
            datasetId,
            adjustmentType: 'account_adjustment',
            moneda: 'GTQ',
            monto: amount,
            descripcion: `Ajuste de cuenta: ${accountKey}`,
            accountKey: accountKey // Para identificar la cuenta específica
        }));

        // Guardar cada ajuste individualmente
        const results = [];
        for (const adjustment of adjustments) {
            try {
                const result = await saveFinancialAdjustment(adjustment);
                results.push({ success: true, adjustment });
            } catch (error) {
                console.error('Error saving individual adjustment:', error);
                results.push({ success: false, error: error.message, adjustment });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`Account adjustments saved: ${successCount}/${results.length}`);

        return {
            success: successCount > 0,
            total: results.length,
            successCount,
            results
        };

    } catch (error) {
        console.error('Error in saveAccountAdjustments:', error);
        throw error;
    }
}

/**
 * Obtiene los grupos financieros almacenados para un dataset
 * @param {string} datasetId - ID del dataset
 * @returns {Promise<Array>} Lista de grupos financieros
 */
async function getFinancialGroups(datasetId) {
    const resolvedDatasetId = datasetId || currentDatasetId;

    if (!resolvedDatasetId) {
        console.warn('getFinancialGroups: datasetId requerido');
        return [];
    }

    try {
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/financial-groups/${resolvedDatasetId}`, {
            method: 'GET',
            headers: {
                'user-id': getCurrentUserId()
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo grupos financieros');
        }

        console.log('Financial groups loaded:', result.groups.length);
        return result.groups;

    } catch (error) {
        console.error('Error in getFinancialGroups:', error);
        return [];
    }
}

/**
 * Obtiene el snapshot más reciente de resultados de grupos financieros
 * @param {string} datasetId - ID del dataset
 * @returns {Promise<{snapshot: object|null, rows: Array}>}
 */
async function getLatestFinancialGroupResults(datasetId) {
    const resolvedDatasetId = datasetId || currentDatasetId;

    if (!resolvedDatasetId) {
        console.warn('getLatestFinancialGroupResults: datasetId requerido');
        return { snapshot: null, rows: [] };
    }

    try {
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/financial-groups-results/${resolvedDatasetId}/latest`, {
            method: 'GET',
            headers: {
                'user-id': getCurrentUserId()
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo snapshot de grupos financieros');
        }

        console.log('Latest financial group snapshot loaded:', {
            snapshotId: result.snapshot?.id || null,
            rows: result.rows?.length || 0
        });

        return {
            snapshot: result.snapshot || null,
            rows: Array.isArray(result.rows) ? result.rows : []
        };

    } catch (error) {
        console.error('Error in getLatestFinancialGroupResults:', error);
        return { snapshot: null, rows: [] };
    }
}

/**
 * Obtiene el historial de snapshots de grupos financieros
 * @param {string} datasetId - ID del dataset
 * @param {number} [limit=5] - Número máximo de snapshots a recuperar
 * @returns {Promise<Array>} Lista de snapshots
 */
async function getFinancialGroupSnapshots(datasetId, limit = 5) {
    const resolvedDatasetId = datasetId || currentDatasetId;

    if (!resolvedDatasetId) {
        console.warn('getFinancialGroupSnapshots: datasetId requerido');
        return [];
    }

    const params = new URLSearchParams({ limit: String(limit) });

    try {
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/financial-groups-results/${resolvedDatasetId}/history?${params.toString()}`, {
            method: 'GET',
            headers: {
                'user-id': getCurrentUserId()
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo historial de snapshots');
        }

        console.log('Financial group snapshots loaded:', result.snapshots.length);
        return result.snapshots;

    } catch (error) {
        console.error('Error in getFinancialGroupSnapshots:', error);
        return [];
    }
}

/**
 * Guarda los resultados calculados de grupos financieros en la base de datos
 * @param {string} datasetId - ID del dataset
 * @param {Array} results - Resultados calculados de grupos financieros
 * @param {string} status - Estado del cálculo
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveFinancialGroupsResults(datasetId, results, status = 'completed') {
    try {
        console.log('Saving financial groups results:', { datasetId, resultsCount: results.length });
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/financial-groups-results/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': getCurrentUserId()
            },
            body: JSON.stringify({
                datasetId,
                results,
                status
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando resultados de grupos financieros');
        }

        console.log('Financial groups results saved successfully:', { 
            runId: result.run.id, 
            rowsCount: result.rows.length 
        });
        
        return result;

    } catch (error) {
        console.error('Error in saveFinancialGroupsResults:', error);
        throw error;
    }
}

/**
 * Obtiene todos los ajustes de un dataset
 * @param {string} datasetId - ID del dataset
 * @returns {Promise<Array>} Array de ajustes
 */
async function getFinancialAdjustments(datasetId) {
    try {
        console.log('Loading adjustments from database for dataset:', datasetId);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/adjustments/${datasetId}`, {
            method: 'GET',
            headers: {
                'user-id': getCurrentUserId()
            }
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo ajustes');
        }

        console.log('Adjustments loaded:', result.adjustments.length);
        return result.adjustments;

    } catch (error) {
        console.error('Error in getFinancialAdjustments:', error);
        return [];
    }
}

// ============================================
// LEDGER INTEGRITY
// ============================================

/**
 * Guarda los resultados de validación de libro mayor
 * @param {string} datasetId - ID del dataset
 * @param {Array} results - Resultados de la validación
 * @param {string} status - Estado de la validación
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveLedgerIntegrityResults(datasetId, results, status = 'completed') {
    try {
        console.log('Saving ledger integrity results:', { datasetId, resultsCount: results.length });
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/ledger-integrity/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': getCurrentUserId()
            },
            body: JSON.stringify({
                datasetId,
                results,
                status
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando validación');
        }

        console.log('Ledger integrity saved successfully:', { 
            runId: result.run.id, 
            rowsCount: result.rows.length 
        });
        
        return result;

    } catch (error) {
        console.error('Error in saveLedgerIntegrityResults:', error);
        throw error;
    }
}

// ============================================
// FUNCIONES DE GUARDADO DUAL (LocalStorage + Database)
// ============================================

/**
 * Guarda un grupo financiero en ambos sistemas (localStorage y base de datos)
 * @param {Object} groupData - Datos del grupo financiero
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveFinancialGroupDual(groupData) {
    try {
        // 1. Guardar en localStorage
        const localStorageResult = saveStoredFinancialGroup(groupData);
        
        // 2. Guardar en base de datos
        const databaseResult = await saveFinancialGroup(groupData);
        
        console.log('Financial group saved to both systems:', {
            localStorage: localStorageResult,
            database: databaseResult
        });
        
        return {
            success: true,
            localStorage: localStorageResult,
            database: databaseResult
        };

    } catch (error) {
        console.error('Error in saveFinancialGroupDual:', error);
        
        // Si falla la base de datos, al menos guardar en localStorage
        try {
            const localStorageResult = saveStoredFinancialGroup(groupData);
            console.warn('Database save failed, localStorage backup successful:', localStorageResult);
            
            return {
                success: true,
                localStorage: localStorageResult,
                database: null,
                warning: 'Database save failed, using localStorage only'
            };
        } catch (localStorageError) {
            console.error('Both systems failed:', { databaseError: error, localStorageError });
            throw error;
        }
    }
}

/**
 * Guarda una cuenta contable en ambos sistemas (localStorage y base de datos)
 * @param {Object} accountData - Datos de la cuenta contable
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveAccountDual(accountData) {
    try {
        // 1. Guardar en localStorage
        const localStorageResult = saveStoredAccount(accountData);
        
        // 2. Guardar en base de datos
        const databaseResult = await saveAccount(accountData);
        
        console.log('Account saved to both systems:', {
            localStorage: localStorageResult,
            database: databaseResult
        });
        
        return {
            success: true,
            localStorage: localStorageResult,
            database: databaseResult
        };

    } catch (error) {
        console.error('Error in saveAccountDual:', error);
        
        // Si falla la base de datos, al menos guardar en localStorage
        try {
            const localStorageResult = saveStoredAccount(accountData);
            console.warn('Database save failed, localStorage backup successful:', localStorageResult);
            
            return {
                success: true,
                localStorage: localStorageResult,
                database: null,
                warning: 'Database save failed, using localStorage only'
            };
        } catch (localStorageError) {
            console.error('Both systems failed:', { databaseError: error, localStorageError });
            throw error;
        }
    }
}

// ============================================
// FUNCIONES LOCALSTORAGE PARA GRUPOS Y CUENTAS
// ============================================

/**
 * Guarda un grupo financiero en localStorage
 * @param {Object} groupData - Datos del grupo financiero
 * @returns {Object} Resultado del guardado local
 */
function saveStoredFinancialGroup(groupData) {
    try {
        const datasetId = groupData.datasetId || currentDatasetId;
        const userId = getCurrentUserId();
        
        if (!datasetId || !userId) {
            console.warn('Missing datasetId or userId for localStorage save');
            return null;
        }
        
        const storageKey = `financial_groups_v1_${userId}_${datasetId}`;
        const existingGroups = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Remove existing group for same ID if exists
        const filteredGroups = existingGroups.filter(g => g.id !== groupData.id);
        
        // Add new group
        const newGroup = {
            id: groupData.id || `local_${Date.now()}`,
            name: groupData.name,
            type: groupData.type || 'group',
            parentLabel: groupData.parentLabel || null,
            value: groupData.value || 0,
            meta: groupData.meta || {},
            datasetId: datasetId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        filteredGroups.push(newGroup);
        localStorage.setItem(storageKey, JSON.stringify(filteredGroups));
        
        console.log('Financial group saved to localStorage:', newGroup);
        return newGroup;
        
    } catch (error) {
        console.error('Error saving financial group to localStorage:', error);
        return null;
    }
}

/**
 * Guarda una cuenta contable en localStorage
 * @param {Object} accountData - Datos de la cuenta contable
 * @returns {Object} Resultado del guardado local
 */
function saveStoredAccount(accountData) {
    try {
        const datasetId = accountData.datasetId || currentDatasetId;
        const userId = getCurrentUserId();
        
        if (!datasetId || !userId) {
            console.warn('Missing datasetId or userId for localStorage save');
            return null;
        }
        
        const storageKey = `accounts_v1_${userId}_${datasetId}`;
        const existingAccounts = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Remove existing account for same code if exists
        const filteredAccounts = existingAccounts.filter(a => a.code !== accountData.code);
        
        // Add new account
        const newAccount = {
            id: accountData.id || `local_${Date.now()}`,
            code: accountData.code,
            name: accountData.name,
            value: accountData.value || 0,
            currentYearValue: accountData.currentYearValue || 0,
            previousYearValue: accountData.previousYearValue || 0,
            debit: accountData.debit || 0,
            credit: accountData.credit || 0,
            meta: accountData.meta || {},
            datasetId: datasetId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        filteredAccounts.push(newAccount);
        localStorage.setItem(storageKey, JSON.stringify(filteredAccounts));
        
        console.log('Account saved to localStorage:', newAccount);
        return newAccount;
        
    } catch (error) {
        console.error('Error saving account to localStorage:', error);
        return null;
    }
}

// ============================================
// SINCRONIZACIÓN DUAL (LocalStorage + Database)
// ============================================

/**
 * Guarda asignación en ambos sistemas (localStorage y base de datos)
 * @param {Object} assignmentData - Datos de la asignación
 * @returns {Promise<Object>} Resultado combinado
 */
async function saveAssignmentDual(assignmentData) {
    try {
        // 1. Guardar en localStorage (sistema actual)
        const localStorageResult = saveStoredAssignment(assignmentData);
        
        // 2. Guardar en base de datos (nuevo sistema)
        const databaseResult = await saveAccountAssignment(assignmentData);
        
        console.log('Assignment saved to both systems:', {
            localStorage: localStorageResult,
            database: databaseResult
        });
        
        return {
            success: true,
            localStorage: localStorageResult,
            database: databaseResult
        };

    } catch (error) {
        console.error('Error in saveAssignmentDual:', error);
        
        // Si falla la base de datos, al menos guardar en localStorage
        try {
            const localStorageResult = saveStoredAssignment(assignmentData);
            console.warn('Database save failed, localStorage backup successful:', localStorageResult);
            
            return {
                success: true,
                localStorage: localStorageResult,
                database: null,
                warning: 'Database save failed, using localStorage only'
            };
        } catch (localStorageError) {
            console.error('Both systems failed:', { databaseError: error, localStorageError });
            throw error;
        }
    }
}

/**
 * Carga asignaciones desde la base de datos y las sincroniza con localStorage
 * @param {string} datasetId - ID del dataset
 * @returns {Promise<Array>} Array de asignaciones sincronizadas
 */
async function loadAndSyncAssignments(datasetId) {
    try {
        console.log('Loading and syncing assignments for dataset:', datasetId);
        
        // 1. Cargar desde base de datos
        const databaseAssignments = await getAccountAssignments(datasetId);
        
        // 2. Cargar desde localStorage
        const localStorageAssignments = getStoredAssignments();
        
        // 3. Sincronizar (priorizar base de datos)
        const mergedAssignments = mergeAssignments(databaseAssignments, localStorageAssignments);
        
        // 4. Actualizar localStorage con datos fusionados
        if (mergedAssignments.length > 0) {
            localStorage.setItem('storedAssignments', JSON.stringify(mergedAssignments));
        }
        
        console.log('Assignments synced:', {
            database: databaseAssignments.length,
            localStorage: localStorageAssignments.length,
            merged: mergedAssignments.length
        });
        
        return mergedAssignments;

    } catch (error) {
        console.error('Error in loadAndSyncAssignments:', error);
        
        // Si falla la base de datos, usar localStorage como fallback
        const localStorageAssignments = getStoredAssignments();
        console.warn('Database load failed, using localStorage fallback:', localStorageAssignments.length);
        
        return localStorageAssignments;
    }
}

/**
 * Fusiona asignaciones de la base de datos y localStorage
 * @param {Array} databaseAssignments - Asignaciones de la base de datos
 * @param {Array} localStorageAssignments - Asignaciones de localStorage
 * @returns {Array} Asignaciones fusionadas
 */
function mergeAssignments(databaseAssignments, localStorageAssignments) {
    const merged = [];
    const seen = new Set();
    
    // Priorizar base de datos (más reciente)
    databaseAssignments.forEach(assignment => {
        const key = `${assignment.account_id}-${assignment.group_content_id}`;
        if (!seen.has(key)) {
            merged.push(convertDatabaseAssignmentToLocalStorage(assignment));
            seen.add(key);
        }
    });
    
    // Agregar solo las de localStorage que no estén en la base de datos
    localStorageAssignments.forEach(assignment => {
        const key = `${assignment.accountId}-${assignment.groupContentId}`;
        if (!seen.has(key)) {
            merged.push(assignment);
            seen.add(key);
        }
    });
    
    return merged;
}

/**
 * Convierte una asignación de la base de datos al formato de localStorage
 * @param {Object} dbAssignment - Asignación de la base de datos
 * @returns {Object} Asignación en formato localStorage
 */
function convertDatabaseAssignmentToLocalStorage(dbAssignment) {
    const meta = dbAssignment?.meta || {};
    const rawAccountId = dbAssignment.account_id || meta.accountId || meta.accountKey;
    const accountId = rawAccountId ? rawAccountId.toString().trim() : '';
    const accountKey = meta.accountKey || accountId;
    const rawGroupContentId = dbAssignment.group_content_id || meta.groupContentId || meta.group_content_id;
    const groupContentId = rawGroupContentId ? rawGroupContentId.toString().trim() : '';
    const parentAccountId = dbAssignment.parent_account_id || meta.parentAccountId || null;
    const datasetId = (dbAssignment.dataset_id || meta.datasetId || '').toString().trim();
    const position = Number.isFinite(dbAssignment.position) ? dbAssignment.position : (Number.isFinite(meta.position) ? meta.position : 0);

    return {
        id: dbAssignment.id,
        accountId,
        accountKey,
        groupContentId,
        parentAccountId,
        position,
        datasetId,
        code: meta.code || meta.accountCode || '',
        name: meta.name || meta.accountName || '',
        value: meta.value ?? meta.currentValue ?? meta.current ?? 0,
        prevValue: meta.prevValue ?? meta.previousValue ?? 0,
        meta,
        createdAt: dbAssignment.created_at,
        updatedAt: dbAssignment.updated_at
    };
}

// ============================================
// LOCALSTORAGE FUNCTIONS (Fallback System)
// ============================================

/**
 * Guarda una asignación en localStorage (sistema de respaldo)
 * @param {Object} assignmentData - Datos de la asignación
 * @returns {Object} Resultado de la operación
 */
function saveStoredAssignment(assignmentData) {
    try {
        const datasetId = assignmentData.datasetId || currentDatasetId;
        const userId = getCurrentUserId();
        
        if (!datasetId || !userId) {
            console.warn('Missing datasetId or userId for localStorage save');
            return null;
        }
        
        const storageKey = `assigned_accounts_v1_${userId}_${datasetId}`;
        const existingAssignments = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Remove existing assignment for same account if exists
        const filteredAssignments = existingAssignments.filter(a => a.accountId !== assignmentData.accountId);
        
        // Add new assignment
        const newAssignment = {
            id: assignmentData.id || `local_${Date.now()}`,
            accountId: assignmentData.accountId,
            groupContentId: assignmentData.groupContentId,
            parentAccountId: assignmentData.parentAccountId || null,
            position: assignmentData.position || 0,
            datasetId: datasetId,
            meta: assignmentData.meta || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        filteredAssignments.push(newAssignment);
        localStorage.setItem(storageKey, JSON.stringify(filteredAssignments));
        
        console.log('Assignment saved to localStorage:', newAssignment);
        return newAssignment;
        
    } catch (error) {
        console.error('Error saving assignment to localStorage:', error);
        return null;
    }
}

/**
 * Obtiene todas las asignaciones desde localStorage
 * @param {string} datasetId - ID del dataset (opcional)
 * @returns {Array} Array de asignaciones
 */
function getStoredAssignments(datasetId = null) {
    try {
        const finalDatasetId = datasetId || currentDatasetId;
        const userId = getCurrentUserId();
        
        if (!finalDatasetId || !userId) {
            return [];
        }
        
        const storageKey = `assigned_accounts_v1_${userId}_${finalDatasetId}`;
        const stored = localStorage.getItem(storageKey);
        
        return stored ? JSON.parse(stored) : [];
        
    } catch (error) {
        console.error('Error getting assignments from localStorage:', error);
        return [];
    }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Verifica la conectividad con la base de datos
 * @returns {Promise<boolean>} True si hay conexión
 */
async function checkDatabaseConnection() {
    try {
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/health`);
        return response.ok;
    } catch (error) {
        console.error('Database connection check failed:', error);
        return false;
    }
}

/**
 * Sincroniza todos los datos del localStorage con la base de datos
 * @returns {Promise<Object>} Resultado de la sincronización
 */
async function syncAllDataToDatabase() {
    try {
        console.log('Starting full data synchronization...');
        
        const results = {
            assignments: { success: 0, failed: 0 },
            adjustments: { success: 0, failed: 0 }
        };
        
        // Sincronizar asignaciones
        const assignments = getStoredAssignments();
        for (const assignment of assignments) {
            try {
                await saveAccountAssignment(assignment);
                results.assignments.success++;
            } catch (error) {
                console.error('Failed to sync assignment:', assignment.id, error);
                results.assignments.failed++;
            }
        }
        
        // Sincronizar ajustes
        const adjustments = getStoredAdjustments();
        for (const adjustment of adjustments) {
            try {
                await saveFinancialAdjustment(adjustment);
                results.adjustments.success++;
            } catch (error) {
                console.error('Failed to sync adjustment:', adjustment.id, error);
                results.adjustments.failed++;
            }
        }
        
        console.log('Data synchronization completed:', results);
        return results;
        
    } catch (error) {
        console.error('Error in syncAllDataToDatabase:', error);
        throw error;
    }
}

// ============================================
// DATOS DEL EXCEL (Conjuntos_datos)
// ============================================

/**
 * Obtiene los datos del Excel desde Conjuntos_datos con contexto de entidad/compromiso
 * @param {string} datasetId - ID del dataset (opcional, si no se proporciona busca el más reciente)
 * @param {string} entityId - ID de la entidad (opcional)
 * @param {string} commitmentId - ID del compromiso (opcional)
 * @returns {Promise<Object>} Datos del Excel
 */
async function getExcelData(datasetId = null, entityId = null, commitmentId = null) {
    try {
        console.log('Getting Excel data from Conjuntos_datos:', { datasetId, entityId, commitmentId });
        
        // Construir URL con contexto
        let apiUrl = `${DATABASE_API_BASE_URL}/api/conjuntos`;
        const params = new URLSearchParams();
        
        if (datasetId) {
            apiUrl += `/${datasetId}`;
        } else {
            // Si no hay datasetId, buscar el más reciente con contexto
            if (entityId) {
                params.append('entity_id', entityId);
            }
            if (commitmentId) {
                params.append('commitment_id', commitmentId);
            }
            params.append('latest', 'true'); // Indicar que queremos el más reciente
            
            if (params.toString()) {
                apiUrl += '?' + params.toString();
            }
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        // Agregar contexto a headers si se proporciona
        if (entityId) {
            headers['entity-id'] = entityId;
        }
        if (commitmentId) {
            headers['commitment-id'] = commitmentId;
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo datos del Excel');
        }

        console.log('Excel data retrieved successfully:', result.data);
        return result.data;

    } catch (error) {
        console.error('Error in getExcelData:', error);
        throw error;
    }
}

/**
 * Guarda los datos del Excel en Conjuntos_datos con contexto de entidad/compromiso
 * @param {Object} excelData - Datos del Excel
 * @param {string} entityId - ID de la entidad
 * @param {string} commitmentId - ID del compromiso
 * @param {string} uploadSection - Sección donde se sube (opcional, por defecto 'conjunto-datos')
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveExcelData(excelData, entityId, commitmentId, uploadSection = 'conjunto-datos') {
    try {
        console.log('Saving Excel data to Conjuntos_datos:', { excelData, entityId, commitmentId, uploadSection });
        
        // Preparar datos con contexto
        const payload = {
            ...excelData,
            entity_id: entityId,
            commitment_id: commitmentId,
            upload_section: uploadSection,
            user_id: getCurrentUserId()
        };
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        // Agregar contexto a headers
        if (entityId) {
            headers['entity-id'] = entityId;
        }
        if (commitmentId) {
            headers['commitment-id'] = commitmentId;
        }
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/conjuntos/save`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando datos del Excel');
        }

        console.log('Excel data saved successfully:', result.data);
        return result.data;

    } catch (error) {
        console.error('Error in saveExcelData:', error);
        throw error;
    }
}

/**
 * Lista conjuntos de datos por contexto de entidad/compromiso
 * @param {string} entityId - ID de la entidad (opcional)
 * @param {string} commitmentId - ID del compromiso (opcional)
 * @param {string} uploadSection - Sección específica (opcional)
 * @returns {Promise<Array>} Lista de conjuntos de datos
 */
async function listExcelDatasets(entityId = null, commitmentId = null, uploadSection = null) {
    try {
        console.log('Listing Excel datasets by context:', { entityId, commitmentId, uploadSection });
        
        // Construir URL con filtros
        let apiUrl = `${DATABASE_API_BASE_URL}/api/conjuntos`;
        const params = new URLSearchParams();
        
        if (entityId) {
            params.append('entity_id', entityId);
        }
        if (commitmentId) {
            params.append('commitment_id', commitmentId);
        }
        if (uploadSection) {
            params.append('upload_section', uploadSection);
        }
        
        if (params.toString()) {
            apiUrl += '?' + params.toString();
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        // Agregar contexto a headers
        if (entityId) {
            headers['entity-id'] = entityId;
        }
        if (commitmentId) {
            headers['commitment-id'] = commitmentId;
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error listando conjuntos de datos');
        }

        console.log('Excel datasets listed successfully:', result.data);
        return result.data;

    } catch (error) {
        console.error('Error in listExcelDatasets:', error);
        throw error;
    }
}

/**
 * Elimina los datos del Excel de Conjuntos_datos
 * @param {string} datasetId - ID del dataset
 * @param {string} entityId - ID de la entidad (para verificación de permisos)
 * @param {string} commitmentId - ID del compromiso (para verificación de permisos)
 * @returns {Promise<boolean>} Resultado de la operación
 */
async function deleteExcelData(datasetId, entityId = null, commitmentId = null) {
    try {
        console.log('Deleting Excel data from Conjuntos_datos:', { datasetId, entityId, commitmentId });
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        // Agregar contexto a headers para verificación de permisos
        if (entityId) {
            headers['entity-id'] = entityId;
        }
        if (commitmentId) {
            headers['commitment-id'] = commitmentId;
        }
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/conjuntos/${datasetId}`, {
            method: 'DELETE',
            headers: headers
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error eliminando datos del Excel');
        }

        console.log('Excel data deleted successfully');
        return true;

    } catch (error) {
        console.error('Error in deleteExcelData:', error);
        throw error;
    }
}

// ============================================
// FORM DATA MANAGEMENT
// ============================================

/**
 * Guarda datos del formulario para una entidad/compromiso específico
 * @param {Object} formData - Datos del formulario
 * @param {string} entityId - ID de la entidad
 * @param {string} commitmentId - ID del compromiso (opcional)
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveFormData(formData, entityId, commitmentId = null) {
    try {
        console.log('Saving form data:', { entityId, commitmentId });
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        if (entityId) headers['entity-id'] = entityId;
        if (commitmentId) headers['commitment-id'] = commitmentId;
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/form-data/save`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                formData: formData,
                entityId: entityId,
                commitmentId: commitmentId
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error guardando datos del formulario');
        }

        console.log('Form data saved successfully');
        return result;

    } catch (error) {
        console.error('Error in saveFormData:', error);
        throw error;
    }
}

/**
 * Carga datos del formulario para una entidad/compromiso específico
 * @param {string} entityId - ID de la entidad
 * @param {string} commitmentId - ID del compromiso (opcional)
 * @returns {Promise<Object|null>} Datos del formulario o null si no hay
 */
async function loadFormData(entityId, commitmentId = null) {
    try {
        console.log('Loading form data:', { entityId, commitmentId });
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        if (entityId) headers['entity-id'] = entityId;
        if (commitmentId) headers['commitment-id'] = commitmentId;
        
        const params = new URLSearchParams();
        if (entityId) params.append('entity_id', entityId);
        if (commitmentId) params.append('commitment_id', commitmentId);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/form-data/load?${params}`, {
            method: 'GET',
            headers: headers
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error cargando datos del formulario');
        }

        console.log('Form data loaded successfully');
        return result.data;

    } catch (error) {
        console.error('Error in loadFormData:', error);
        return null;
    }
}

// ============================================
// FILE MANAGEMENT
// ============================================

/**
 * Sube un archivo con contexto de entidad/compromiso
 * @param {File} file - Archivo a subir
 * @param {string} entityId - ID de la entidad
 * @param {string} commitmentId - ID del compromiso (opcional)
 * @param {string} section - Sección del formulario
 * @returns {Promise<Object>} Resultado de la operación
 */
async function uploadFile(file, entityId, commitmentId = null, section = 'general') {
    try {
        console.log('Uploading file:', { fileName: file.name, entityId, commitmentId, section });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entity_id', entityId);
        if (commitmentId) formData.append('commitment_id', commitmentId);
        formData.append('section', section);
        
        const headers = {
            'user-id': getCurrentUserId()
        };
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/files/upload`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error subiendo archivo');
        }

        console.log('File uploaded successfully');
        return result;

    } catch (error) {
        console.error('Error in uploadFile:', error);
        throw error;
    }
}

/**
 * Lista archivos para una entidad/compromiso específico
 * @param {string} entityId - ID de la entidad
 * @param {string} commitmentId - ID del compromiso (opcional)
 * @param {string} section - Sección específica (opcional)
 * @returns {Promise<Array>} Lista de archivos
 */
async function listFiles(entityId, commitmentId = null, section = null) {
    try {
        console.log('Listing files:', { entityId, commitmentId, section });
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        if (entityId) headers['entity-id'] = entityId;
        if (commitmentId) headers['commitment-id'] = commitmentId;
        
        const params = new URLSearchParams();
        if (entityId) params.append('entity_id', entityId);
        if (commitmentId) params.append('commitment_id', commitmentId);
        if (section) params.append('section', section);
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/files/list?${params}`, {
            method: 'GET',
            headers: headers
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error listando archivos');
        }

        console.log('Files listed successfully:', result.data?.length || 0);
        return result.data || [];

    } catch (error) {
        console.error('Error in listFiles:', error);
        return [];
    }
}

/**
 * Elimina un archivo específico
 * @param {string} fileId - ID del archivo
 * @param {string} entityId - ID de la entidad (para verificación)
 * @param {string} commitmentId - ID del compromiso (para verificación)
 * @returns {Promise<boolean>} Resultado de la operación
 */
async function deleteFile(fileId, entityId = null, commitmentId = null) {
    try {
        console.log('Deleting file:', { fileId, entityId, commitmentId });
        
        const headers = {
            'Content-Type': 'application/json',
            'user-id': getCurrentUserId()
        };
        
        if (entityId) headers['entity-id'] = entityId;
        if (commitmentId) headers['commitment-id'] = commitmentId;
        
        const response = await fetch(`${DATABASE_API_BASE_URL}/api/files/${fileId}`, {
            method: 'DELETE',
            headers: headers
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error eliminando archivo');
        }

        console.log('File deleted successfully');
        return true;

    } catch (error) {
        console.error('Error in deleteFile:', error);
        throw error;
    }
}

// Exportar funciones para uso global
window.saveAccountAssignment = saveAccountAssignment;
window.getAccountAssignments = getAccountAssignments;
window.deleteAccountAssignment = deleteAccountAssignment;
window.saveFinancialAdjustment = saveFinancialAdjustment;
window.getFinancialAdjustments = getFinancialAdjustments;
window.saveAccountAdjustments = saveAccountAdjustments;
window.saveFinancialGroupsResults = saveFinancialGroupsResults;
window.saveLedgerIntegrityResults = saveLedgerIntegrityResults;
window.saveAssignmentDual = saveAssignmentDual;
window.getFinancialGroups = getFinancialGroups;
window.getLatestFinancialGroupResults = getLatestFinancialGroupResults;
window.getFinancialGroupSnapshots = getFinancialGroupSnapshots;
window.loadAndSyncAssignments = loadAndSyncAssignments;
window.checkDatabaseConnection = checkDatabaseConnection;
window.syncAllDataToDatabase = syncAllDataToDatabase;
window.getExcelData = getExcelData;
window.saveExcelData = saveExcelData;
window.deleteExcelData = deleteExcelData;

// Form data management
window.saveFormData = saveFormData;
window.loadFormData = loadFormData;

// File management
window.uploadFile = uploadFile;
window.listFiles = listFiles;
window.deleteFile = deleteFile;

// Nuevas funciones para grupos financieros y cuentas
window.saveFinancialGroup = saveFinancialGroup;
window.getFinancialGroups = getFinancialGroups;
window.saveAccount = saveAccount;
window.saveAccountsBatch = saveAccountsBatch;

// Funciones duales (localStorage + base de datos)
window.saveFinancialGroupDual = saveFinancialGroupDual;
window.saveAccountDual = saveAccountDual;
window.saveStoredFinancialGroup = saveStoredFinancialGroup;
window.saveStoredAccount = saveStoredAccount;
window.saveStoredAssignment = saveStoredAssignment;
window.getStoredAssignments = getStoredAssignments;

// Debug: Verificar que el archivo se cargó correctamente
console.log('✅ database-api.js cargado correctamente');
console.log('Funciones disponibles:', {
    saveAccountAssignment: !!window.saveAccountAssignment,
    getAccountAssignments: !!window.getAccountAssignments,
    deleteAccountAssignment: !!window.deleteAccountAssignment,
    saveFinancialAdjustment: !!window.saveFinancialAdjustment,
    getFinancialAdjustments: !!window.getFinancialAdjustments,
    saveAccountAdjustments: !!window.saveAccountAdjustments,
    saveFinancialGroupsResults: !!window.saveFinancialGroupsResults,
    getFinancialGroups: !!window.getFinancialGroups,
    getLatestFinancialGroupResults: !!window.getLatestFinancialGroupResults,
    getFinancialGroupSnapshots: !!window.getFinancialGroupSnapshots,
    saveLedgerIntegrityResults: !!window.saveLedgerIntegrityResults,
    getExcelData: !!window.getExcelData,
    saveExcelData: !!window.saveExcelData,
    syncAllDataToDatabase: !!window.syncAllDataToDatabase,
    loadAndSyncAssignments: !!window.loadAndSyncAssignments,
    getFinancialGroupStructure: !!window.getFinancialGroupStructure
});
