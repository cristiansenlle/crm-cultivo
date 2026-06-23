# Implementación del Sistema de Login para Producción

Para llevar el CANNABIS-CORE 360 OS a producción de forma segura, implementaremos el sistema de autenticación nativo de Supabase (Email/Contraseña). Esto protegerá todas las pantallas del CRM.

## Requisito Previo (Acción del Usuario)
Antes de comenzar, es **obligatorio** que el usuario cree un usuario de prueba en su panel de Supabase:
1. Ir a Supabase Dashboard -> Authentication -> Users.
2. Hacer clic en "Add user" -> "Create new user".
3. Ingresar un email (ej. `admin@core360.com`) y una contraseña fuerte.
4. (Opcional) Desactivar "Confirm email" en Auth settings si solo se usará para el equipo interno.

## Propuesta de Cambios

### 1. Nueva Pantalla de Login
Se creará una nueva página `login.html` que servirá como la puerta de entrada. 

#### [NEW] [login.html](file:///C:/Users/Cristian/.gemini/antigravity/crm%20cannabis/login.html)
- Diseño responsivo utilizando las variables CSS existentes (fondos oscuros, glow effects, panel-dark).
- Formulario centralizado con inputs para Email y Contraseña.
- Botón principal de "Ingresar al Sistema" con estados de carga.

#### [NEW] [login.js](file:///C:/Users/Cristian/.gemini/antigravity/crm%20cannabis/login.js)
- Función para capturar los datos y hacer la llamada a `supabase.auth.signInWithPassword()`.
- Lógica de redirección a `index.html` tras un login exitoso.
- Manejo de errores visuales (ej. credenciales invalidas).

### 2. Protección de Rutas Globales
Actualmente todas las páginas (`index.html`, `cultivo.html`, etc.) son públicas. Las protegeremos desde la raíz.

#### [MODIFY] [supabase-client.js](file:///C:/Users/Cristian/.gemini/antigravity/crm%20cannabis/supabase-client.js)
- Agregaremos una función que se ejecute al cargar (I.I.F.E) que llame a `supabase.auth.getSession()`.
- Si el usuario *no* está autenticado y *no* está en la página de login, forzaremos un `window.location.href = 'login.html'`.

### 3. Cierre de Sesión y Perfil
El usuario necesita poder salir del sistema con seguridad.

#### [MODIFY] [Todos los HTMLs (`index`, `cultivo`, `tareas`, etc.)]
- Se agregará un botón/enlace de "Cerrar Sesión" en la sección de `.user-profile` (arriba a la derecha) o en la base del `sidebar`.
- Este botón se vinculará a una nueva función en `main.js` que ejecute `supabase.auth.signOut()`.

## Plan de Verificación
1. Iniciar la UI (Dashboard) en el navegador virtual.
2. El sistema deberá expulsarme a `login.html`.
3. Intentaré ingresar con una contraseña falsa (debe dar error).
4. El usuario nos proporcionará sus credenciales de prueba o las ingresará él mismo para verificar el ingreso.
5. Hacer clic en "Cerrar Sesión" para revisar la destrucción de la cookie/sesión.
