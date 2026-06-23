# Sistema de Login (Supabase Auth)

- [x] Crear la página de inicio de sesión (`login.html`) con estética premium y soporte claro/oscuro
- [x] Implementar lógica de autenticación (`login.js`) usando `supabase.auth.signInWithPassword`
- [x] Proteger rutas globales: modificar `supabase-client.js` para verificar la sesión activa (`supabase.auth.getSession`)
- [x] Redirigir a `login.html` si no hay sesión iniciada en páginas protegidas
- [x] Agregar botón de "Cerrar Sesión" en la barra lateral de todas las vistas
- [x] Probar el flujo completo de login, acceso y logout
