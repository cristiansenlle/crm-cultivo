const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    console.log("1. Conectando al VPS de Contabo (109.199.99.126)...");
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

    const targetDir = '/opt/crm-cannabis-next/next-app';
    await ssh.execCommand(`mkdir -p ${targetDir}/src/lib/agronomy ${targetDir}/src/app/api/agronomy/import-sheet ${targetDir}/src/app/api/vision/status ${targetDir}/src/lib/vision ${targetDir}/src/components/vision`);

    const files = [
      'src/lib/agronomy/fertigationUtils.ts',
      'src/lib/agronomy/nutrientProfiles.ts',
      'src/lib/agronomy/fertilizationPlanEngine.ts',
      'src/app/insumos/page.tsx',
      'src/app/cultivo/CultivoView.tsx',
      'src/app/cultivo/FertilizationPlanModal.tsx',
      'src/app/cultivo/BitacoraModal.tsx',
      'src/app/cultivo/BitacoraGlobalModal.tsx',
      'src/app/cultivo/BatchReportModal.tsx',
      'src/app/agronomy/page.tsx',
      'src/app/protocolos/page.tsx',
      'src/app/api/agronomy/import-sheet/route.ts',
      'src/app/api/analyze-crop/route.ts',
      'src/app/api/vision/status/route.ts',
      'src/lib/vision/VisionAgentEngine.ts',
      'src/components/vision/VisionWidget.tsx',
      'src/components/AiAnalyzerModal.tsx'
    ];

    for (const f of files) {
      console.log("Subiendo:", f);
      await ssh.putFile('next-app/' + f, `${targetDir}/${f}`);
    }

    console.log(`2. Archivos subidos. Ejecutando npm run build en ${targetDir}...`);
    const res = await ssh.execCommand('npm run build', { cwd: targetDir });
    console.log(res.stdout);
    if (res.stderr) console.error("BUILD STDERR:", res.stderr);
    if (res.code !== 0) {
      throw new Error("Build failed with exit code " + res.code);
    }

    console.log("3. Reiniciando next-hud en PM2...");
    await ssh.execCommand('pm2 restart next-hud', { cwd: targetDir });
    const pm2Status = await ssh.execCommand('pm2 list');
    console.log(pm2Status.stdout);
    console.log("¡Despliegue en Contabo completado exitosamente!");

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
