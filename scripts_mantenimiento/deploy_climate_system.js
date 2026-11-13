const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
  try {
    console.log("1. Conectando al VPS de Contabo (109.199.99.126)...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

    console.log("2. Subiendo mqtt_logger.js...");
    const localMqttLogger = path.join(__dirname, 'mqtt_logger.js');
    await ssh.putFile(localMqttLogger, '/opt/crm-cannabis-next/scripts_mantenimiento/mqtt_logger.js');
    await ssh.putFile(localMqttLogger, '/opt/crm-cannabis-next/mqtt_logger.js');

    console.log("3. Reiniciando mqtt_logger...");
    await ssh.execCommand('pm2 restart mqtt_logger');

    console.log("4. Subiendo componentes y rutas de Broadlink / Next.js...");
    const nextAppRoot = path.join(__dirname, '..', 'next-app');
    const targetRoot = '/opt/crm-cannabis-next/next-app';

    await ssh.execCommand(`mkdir -p ${targetRoot}/src/app/api/iot/mqtt_publish ${targetRoot}/src/app/iot/devices`);

    await ssh.putFile(
      path.join(nextAppRoot, 'src/app/api/iot/mqtt_publish/route.ts'),
      `${targetRoot}/src/app/api/iot/mqtt_publish/route.ts`
    );
    await ssh.putFile(
      path.join(nextAppRoot, 'src/app/iot/devices/BroadlinkPanel.tsx'),
      `${targetRoot}/src/app/iot/devices/BroadlinkPanel.tsx`
    );

    console.log("5. Compilando Next.js en VPS Contabo...");
    const buildRes = await ssh.execCommand('npm run build', { cwd: targetRoot });
    console.log(buildRes.stdout.slice(-1500));
    if (buildRes.stderr) console.error("BUILD STDERR:", buildRes.stderr);

    console.log("6. Reiniciando next-hud en PM2...");
    await ssh.execCommand('pm2 restart next-hud');

    console.log("7. Probando endpoint de verificación remota RM4...");
    await new Promise(r => setTimeout(r, 3000));
    const verifyRes = await ssh.execCommand(`curl -s -X POST http://127.0.0.1/api/iot/mqtt_publish -H "Content-Type: application/json" -d '{"action":"verify_rm4"}'`);
    console.log("Respuesta /api/iot/mqtt_publish (verify_rm4):", verifyRes.stdout);

    console.log("8. Verificando logs recientes de mqtt_logger...");
    const logsRes = await ssh.execCommand('pm2 logs mqtt_logger --lines 15 --nostream');
    console.log(logsRes.stdout);

    console.log("✅ ¡Despliegue completado con éxito!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error durante despliegue:", e);
    process.exit(1);
  }
}

run();
