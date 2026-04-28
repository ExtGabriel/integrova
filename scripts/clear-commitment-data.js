// Script para limpiar y verificar datos de compromisos en localStorage
// Ejecutar en la consola del navegador (F12 -> Console)

console.log('🔄 Limpiando datos antiguos de compromisos...');

// Obtener todas las claves del localStorage
const keys = Object.keys(localStorage);

// Filtrar y eliminar claves relacionadas con compromisos
const commitmentKeys = keys.filter(key =>
    key.startsWith('commitment_') ||
    key.startsWith('form_')
);

console.log(`📋 Encontradas ${commitmentKeys.length} claves de compromisos/formularios`);

commitmentKeys.forEach(key => {
    console.log(`   ❌ Eliminando: ${key}`);
    localStorage.removeItem(key);
});

console.log('✅ Limpieza completada!');
console.log('🔄 Recargando página automáticamente...');
console.log('');
console.log('📊 Nueva estructura de formularios por fase:');
console.log('  1️⃣ Planificación: 7 formularios (A100, A200, A300, A360, A400, A500, A510)');
console.log('  2️⃣ Evaluación de Riesgo: 10 formularios (B100, B200, B300, B335, B350, B400, B450, B500, B510, B600)');
console.log('  3️⃣ Respuesta al Riesgo: 3 formularios (C100, C160, C165)');
console.log('  4️⃣ Documentos de Cierre: 5 formularios (D100, D200, D350, D500, D600)');
console.log('  📝 TOTAL: 25 formularios por compromiso');
console.log('');
console.log('✨ Estados de compromiso ahora se calculan automáticamente:');
console.log('   - Pendiente: 0% completado');
console.log('   - En Progreso: 1-99% completado');
console.log('   - Completado: 100% completado');

// Recargar automáticamente después de 2 segundos
setTimeout(() => {
    location.reload();
}, 2000);
