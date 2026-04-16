const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";
// Inicializa el cliente global (requiere que el script del CDN de Supabase se haya cargado antes)
if (typeof supabase !== 'undefined') {
    // Si supabase está en window, creamos el cliente
    // Esto es válido si usamos el UMD tag: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    window.sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client Init OK.");

    // ======== PROTECCIÓN GLOBAL DE RUTAS ========
    // Verificamos de forma síncrona/inmediata si existe una sesión
    const checkAuthStatus = async () => {
        const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/login') || window.location.pathname === '/login';

        try {
            const { data: { session }, error } = await window.sbClient.auth.getSession();

            if (error) throw error;

            if (!session && !isLoginPage) {
                console.warn("Acceso denegado: No hay sesión activa. Redirigiendo al Login.");
                window.location.href = 'login.html';
            } else if (session && isLoginPage) {
                // Si está en login y ya está logueado, lo mandamos al index
                window.location.href = 'index.html';
            }
        } catch (e) {
            console.error("Error validando autenticación:", e.message);
            // Ante cualquier error grave de Auth que no deje leer cookies, lo pateamos a login.
            if (!isLoginPage) window.location.href = 'login.html';
        }
    };

    // Al cargarse este script (que está en head de casi todas las páginas), validamos:
    checkAuthStatus();

    // Además, podemos escuchar si el usuario hace logout en otra pestaña:
    window.sbClient.auth.onAuthStateChange((event, session) => {
        const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/login') || window.location.pathname === '/login';
        if (event === 'SIGNED_OUT' && !isLoginPage) {
            window.location.href = 'login.html';
        }
    });

    // ======== FUNCIÓN GLOBAL DE LOGOUT ========
    window.logoutUser = async () => {
        try {
            const { error } = await window.sbClient.auth.signOut();
            if (error) throw error;
            // The onAuthStateChange hook will handle redirect, or we can force it:
            window.location.href = 'login.html';
        } catch (e) {
            console.error("Error al cerrar sesión:", e);
            alert("No se pudo cerrar sesión. Verifique su conexión.");
        }
    };

} else {
    console.warn("Librería supabase no detectada en el DOM.");
}
