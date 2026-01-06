// Supabase client initializer for browser (no service role exposed)
(async function initSupabaseClient() {
    if (typeof window === 'undefined') return;

    const resolveEnv = (key) => {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
        if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
        if (window[key]) return window[key];
        return null;
    };

    const SUPABASE_URL = resolveEnv('VITE_SUPABASE_URL') || resolveEnv('NEXT_PUBLIC_SUPABASE_URL') || resolveEnv('SUPABASE_URL');
    const SUPABASE_ANON_KEY = resolveEnv('VITE_SUPABASE_ANON_KEY') || resolveEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || resolveEnv('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_*)');
        return;
    }

    // Load supabase-js ESM from CDN once
    try {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.2/+esm');
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                storageKey: 'cfe-insight-auth'
            }
        });
        window.supabaseClient = client;
        console.log('✅ Supabase client inicializado en frontend');
    } catch (err) {
        console.error('No se pudo cargar supabase-js desde CDN:', err);
    }
})();
