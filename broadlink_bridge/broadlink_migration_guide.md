# Guía de Migración Broadlink RM4 Mini al Cultivo Definitivo

## 1. Configuración de Wi-Fi del Broadlink
1. Conectar el RM4 Mini a la corriente en la nueva sala.
2. Mantener presionado el botón Reset (con un clip) hasta que la luz azul parpadee rápidamente.
3. Soltar y volver a mantener presionado el botón Reset hasta que la luz azul parpadee LENTAMENTE (Modo AP activado).
4. En la computadora local, conectarse a la red Wi-Fi llamada `BroadlinkProv`.
5. Abrir la terminal PowerShell en la ruta `C:\Users\crist\.gemini\antigravity\crm cannabis\broadlink_bridge`
6. Ejecutar el script:
   ```bash
   node wifi_setup.js "NombreRedLocal" "ContraseñaRedLocal"
   ```
   *(Sustituir con los datos reales manteniendo las comillas).*
7. El RM4 Mini dejará de parpadear y se conectará al router local.

## 2. Reconexión del Sistema
1. Volver a conectar la computadora a la red Wi-Fi normal (la misma que configuraste en el paso anterior).
2. En la terminal (misma ruta `broadlink_bridge`), arrancar el puente MQTT local:
   ```bash
   node bridge.js
   ```
   *(Recomendación: Configurar este proceso con PM2 u otro gestor de inicio para que arranque solo al prender la computadora local).*

## 3. Pruebas y Aprendizaje Infrarrojo
1. Abrir la aplicación web en producción: `http://109.199.99.126:3000/iot/devices`
2. Ir a "Aprender Nuevo Comando".
3. Apuntar el control remoto (ej. Aire Acondicionado) al RM4 y presionar el botón inmediatamente después de darle click a aprender en la web (hay 30 segundos límite).
4. El comando debería aparecer en la web y guardarse en la base de datos Supabase.

*(Esta memoria se guarda en el directorio del proyecto para poder retomarla de inmediato cuando el usuario lo solicite)*
