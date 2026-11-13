const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');
const ssh = new NodeSSH();

async function normalizeExistingBroadlinkCommands() {
  try {
    let envFile = fs.readFileSync(path.join(__dirname, '..', 'next-app', '.env.local'), 'utf8').replace(/^\uFEFF/, '');
    let SUPABASE_URL = '';
    let SUPABASE_ANON_KEY = '';
    envFile.split('\n').forEach(l => {
      if (l.includes('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = l.split('=')[1].trim();
      if (l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = l.split('=')[1].trim();
    });
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/broadlink_commands?select=*&order=created_at.asc`, { headers });
    const cmds = await res.json();
    let idx = 1;
    for (const cmd of cmds) {
      if (cmd.hex_code && cmd.hex_code.startsWith('MACRO:')) continue;
      if (!cmd.device_ip || !cmd.device_ip.trim().startsWith('{')) {
        const meta = JSON.stringify({
          equipment: 'Climatizador',
          order: idx++,
          ip: cmd.device_ip || '192.168.100.7',
        });
        await fetch(`${SUPABASE_URL}/rest/v1/broadlink_commands?id=eq.${cmd.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ device_ip: meta }),
        });
        console.log(`Normalizado comando "${cmd.name}" -> ${meta}`);
      }
    }
  } catch (e) {
    console.warn("Aviso normalizando comandos:", e.message);
  }
}

async function run() {
  try {
    await normalizeExistingBroadlinkCommands();

    console.log("1. Conectando al VPS de Contabo (109.199.99.126)...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

    console.log("2. Subiendo componentes de Broadlink y Climatización...");
    const nextAppRoot = path.join(__dirname, '..', 'next-app');
    const targetRoot = '/opt/crm-cannabis-next/next-app';

    await ssh.putFile(
      path.join(nextAppRoot, 'src/app/iot/devices/BroadlinkPanel.tsx'),
      `${targetRoot}/src/app/iot/devices/BroadlinkPanel.tsx`
    );
    await ssh.putFile(
      path.join(nextAppRoot, 'src/app/iot/devices/ClimateAutomationPanel.tsx'),
      `${targetRoot}/src/app/iot/devices/ClimateAutomationPanel.tsx`
    );

    console.log("3. Compilando Next.js en VPS Contabo...");
    const buildRes = await ssh.execCommand('npm run build', { cwd: targetRoot });
    console.log(buildRes.stdout.slice(-1500));
    if (buildRes.stderr) console.error("BUILD STDERR:", buildRes.stderr);

    console.log("4. Reiniciando next-hud en PM2...");
    await ssh.execCommand('pm2 restart next-hud');

    console.log("✅ ¡Despliegue de agrupación por equipos completado con éxito!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error durante despliegue:", e);
    process.exit(1);
  }
}

run();
