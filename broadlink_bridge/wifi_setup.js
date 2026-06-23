const broadlink = require('node-broadlink');

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Uso: node wifi_setup.js <NombreDeTuWiFi> <ContraseñaDeTuWiFi> [ModoSeguridad]");
    console.log("Modos de Seguridad: 0 = none, 1 = WEP, 2 = WPA1, 3 = WPA2 (por defecto), 4 = WPA1/2");
    console.log("\nINSTRUCCIONES:");
    console.log("1. Conecta el Broadlink a la corriente.");
    console.log("2. Mantén presionado el botón Reset hasta que la luz azul parpadee rápido (Modo AP 1).");
    console.log("3. Mantén presionado el botón Reset NUEVAMENTE hasta que la luz azul parpadee LENTO (Modo AP 2 / BroadlinkProv).");
    console.log("4. Conecta la computadora al WiFi llamado 'BroadlinkProv'.");
    console.log("5. Ejecuta este script.");
    process.exit(1);
}

const ssid = args[0];
const password = args[1];
const securityMode = args.length > 2 ? parseInt(args[2]) : 3; // 3 = WPA2 por defecto

console.log(`[WIFI] Configurando el Broadlink para conectarse a la red: "${ssid}"...`);

try {
    broadlink.setup(ssid, password, securityMode);
    console.log("[OK] Las credenciales han sido enviadas al dispositivo.");
    console.log("[WIFI] El Broadlink ahora debería dejar de parpadear y conectarse a tu red WiFi.");
    console.log("Nota: Ahora reconecta tu computadora a tu red WiFi normal y reinicia el puente (node bridge.js).");
} catch (error) {
    console.error("[ERROR] Hubo un problema al configurar el WiFi:", error);
}
