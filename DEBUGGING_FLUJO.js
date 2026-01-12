/**
 * FLUJO DE INICIALIZACIÓN - CFE INSIGHT DASHBOARD
 *
 * Este archivo documenta el flujo completo de inicialización
 * para debuggear problemas
 */

// ============================================================
// PASO 1: Carga de Página (dashboard.html)
// ============================================================

/*
  <head>
    <!-- Aquí NO hay scripts -->
  </head>

  <body>
    <!-- ... contenido del dashboard ... -->

    <!-- FIN del body -->
    <script src="../js/config-supabase.js"></script>      ← PRIMERO: Config
    <script src="../js/supabaseClient.js"></script>        ← SEGUNDO: Supabase
    <script src="../js/api-client.js"></script>            ← TERCERO: API
    <script src="../js/dashboard-init.js"></script>        ← CUARTO: Init
    <script src="bootstrap.bundle.min.js"></script>

    <script>
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
      } else {
        initDashboard();
      }
    </script>
  </body>
*/

// ============================================================
// PASO 2: Ejecución de Scripts
// ============================================================

// 2.1) config-supabase.js ← 100ms
//      └─ Define: window.SUPABASE_CONFIG = { url, anonKey }

// 2.2) supabaseClient.js ← 200ms
//      ├─ Lee: window.SUPABASE_CONFIG
//      ├─ Carga SDKdesde CDN dinámicamente
//      ├─ Crea: window.supabaseClient
//      ├─ Crea: window.supabaseReady (Promise)
//      └─ Expone:
//         ├─ window.getSupabaseClient()
//         └─ window.getSupabaseSession()

// 2.3) api-client.js ← 50ms
//      ├─ Lee: window.getSupabaseSession
//      ├─ Crea: window.API = { ... }
//      └─ Métodos:
//         ├─ getSession()      ← Usa window.getSupabaseSession()
//         ├─ getMyProfile()    ← Usa window.getSupabaseClient()
//         ├─ signOut()
//         ├─ showError()
//         ├─ showSuccess()
//         └─ showLoading()

// 2.4) dashboard-init.js ← 50ms
//      ├─ Define: window.initDashboard()
//      └─ AÚNNO EJECUTA (se ejecuta después)

// 2.5) Bootstrap ← 300ms
//      └─ Componentes UI

// ============================================================
// PASO 3: DOMContentLoaded o ejecución inmediata
// ============================================================

/*
  Si document.readyState === 'loading':
    Espera a DOMContentLoaded
  Luego:
    initDashboard()
*/

// ============================================================
// PASO 4: FLUJO DE INITDASHBOARD() - CRÍTICO
// ============================================================

/*
  ┌─ initDashboard() {
  │
  ├─ PASO 1: Validar window.API existe
  │  ├─ Si no existe → showFatalError() → DETENER
  │  └─ Si existe → ✅ Continuar
  │
  ├─ PASO 2: Mostrar loading
  │  └─ window.API.showLoading(true)
  │
  ├─ PASO 3: Obtener sesión
  │  ├─ session = await window.API.getSession()
  │  ├─ Si no sesión → redirectToLogin() → DETENER
  │  └─ Si sesión → ✅ Continuar
  │
  ├─ PASO 4: Obtener perfil
  │  ├─ profile = await window.API.getMyProfile()
  │  │  └─ (usa sesión.user.id para filtrar public.users por id)
  │  ├─ Si no perfil → showFatalError() → DETENER
  │  └─ Si perfil → ✅ Continuar
  │
  ├─ PASO 5: Guardar en memoria global
  │  ├─ window.currentUserProfile = profile
  │  └─ window.currentSession = session
  │
  ├─ PASO 6: Renderizar dashboard
  │  ├─ Mostrar nombre: "Bienvenido, {profile.full_name}"
  │  ├─ Aplicar restricciones por rol
  │  └─ Actualizar mes actual
  │
  ├─ PASO 7: Cargar datos
  │  ├─ Compromisos
  │  ├─ Entidades
  │  ├─ Usuarios
  │  └─ etc.
  │
  ├─ PASO 8: Setup event listeners
  │  ├─ Botón logout
  │  └─ etc.
  │
  ├─ PASO 9: Ocultar loading
  │  └─ window.API.showLoading(false)
  │
  └─ ✅ Dashboard listo para usar
*/

// ============================================================
// PASO 5: Debuggear en Consola
// ============================================================

/*
  // Ver configuración
  console.log('Supabase Config:', window.SUPABASE_CONFIG);

  // Ver cliente
  console.log('Supabase Client:', window.supabaseClient);

  // Ver si supabase está listo
  window.supabaseReady.then(() => console.log('✅ Supabase listo'));

  // Ver API
  console.log('API:', window.API);

  // Probar flujo manualmente
  const session = await window.API.getSession();
  console.log('Session:', session);

  const profile = await window.API.getMyProfile();
  console.log('Profile:', profile);

  // Iniciar dashboard
  await window.initDashboard();
*/

// ============================================================
// SITUACIONES PROBLEMÁTICAS Y SOLUCIONES
// ============================================================

/*
  ❌ PROBLEMA: "window.API is undefined"
  ✅ SOLUCIÓN:
     1. Verificar que api-client.js está en dashboard.html
     2. Verificar orden: supabaseClient.js ANTES de api-client.js
     3. Ver consola para errores de carga

  ❌ PROBLEMA: "No hay sesión activa"
  ✅ SOLUCIÓN:
     1. Usuario no está logueado → OK, redirige a login
     2. Si debería haber sesión:
        - Verificar que config-supabase.js tiene credenciales correctas
        - Ver en DevTools > Application > Cookies si hay 'cfe-insight-auth'

  ❌ PROBLEMA: "Perfil no encontrado"
  ✅ SOLUCIÓN:
     1. Ver en Supabase > Editor > public.users
     2. Verificar que existe usuario con id = session.user.id
     3. Verificar que el usuario tiene role asignado

  ❌ PROBLEMA: Dashboard se queda en "Cargando..."
  ✅ SOLUCIÓN:
     1. Ver consola para errores
     2. Buscar líneas que digan:
        - "❌ ERROR" = problema de inicialización
        - "⚠️ WARNING" = algo no estándar pero no crítico
     3. Si hay timeout, aumentar tiempo en window.API.showLoading()

  ❌ PROBLEMA: Errores CORS desde Supabase
  ✅ SOLUCIÓN:
     1. Verificar que config-supabase.js usa la URL correcta
     2. Verificar que anonKey es válida
     3. Verificar que table 'users' tiene RLS permitiendo SELECT
        - RLS debe permitir: SELECT * FROM public.users WHERE auth.uid() = id
*/

// ============================================================
// ÁRBOL DE DEPENDENCIAS
// ============================================================

/*
  config-supabase.js (window.SUPABASE_CONFIG)
       ↓
  supabaseClient.js (window.getSupabaseClient, window.getSupabaseSession)
       ↓
  api-client.js (window.API)
       ↓
  dashboard-init.js (window.initDashboard)
       ↓
  [inline script] → await window.initDashboard()
       ↓
  ✅ Dashboard Listo
*/

// ============================================================
// CHECKLIST DE DEBUGGING
// ============================================================

/*
  □ ¿config-supabase.js está en head o antes de supabaseClient.js?
  □ ¿window.SUPABASE_CONFIG tiene url y anonKey válidos?
  □ ¿supabaseClient.js se carga sin errores?
  □ ¿window.supabaseClient existe?
  □ ¿api-client.js se carga sin errores?
  □ ¿window.API existe?
  □ ¿dashboard-init.js se carga sin errores?
  □ ¿window.initDashboard es función?
  □ ¿Se llama initDashboard() después de DOMContentLoaded?
  □ ¿Hay sesión activa (usuario logueado)?
  □ ¿Existe el usuario en public.users?
  □ ¿El usuario tiene id que coincide con session.user.id?
  □ ¿RLS de la tabla users permite SELECT?
  □ ¿Los logs de consola son claros y descriptivos?
*/

// ============================================================
// LOGS ESPERADOS EN CONSOLA
// ============================================================

/*
  ✅ Supabase SDK cargado desde CDN
  ✅ Supabase client inicializado correctamente
  ✅ API Client inicializado (window.API disponible)
  ✅ dashboard-init.js cargado (window.initDashboard disponible)
  ✅ window.API disponible
  🔄 Obteniendo sesión...
  ✅ Sesión obtenida: [uuid]
  🔄 Obteniendo perfil...
  ✅ Perfil obtenido: [user_id]
  🔄 Renderizando dashboard...
  🔄 Cargando datos...
  ✅ Dashboard inicializado correctamente
*/
