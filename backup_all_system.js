const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Creando Backups Estables ---');

// 1. Remote Bot Backup (Running our existing script)
try {
    console.log('Respaldando Bot PM2 Remoto...');
    execSync('node backup_stable_bot.js', { stdio: 'inherit' });
} catch (e) {
    console.error('Error al respaldar el bot:', e);
}

// 2. N8N Workflow Backup
try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const workflowPath = 'n8n-crm-cannabis-workflow-FIXED.json';
    const workflowBackupPath = `n8n-workflow-stable-backup-${timestamp}.json`;
    const workflowLatestPath = `n8n-workflow-stable-backup-latest.json`;
    
    fs.copyFileSync(workflowPath, workflowBackupPath);
    fs.copyFileSync(workflowPath, workflowLatestPath);
    console.log(`\nCopia de seguridad del Workflow n8n creada en local: ${workflowBackupPath} y latest`);
} catch(e) {
    console.error('Error al respaldar el workflow n8n:', e);
}

// 3. Web App Backup
try {
    const backupDir = `web-app-stable-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const latestBackupDir = `web-app-stable-backup-latest`;
    
    // Si existe el latest, borrarlo antes de recrearlo
    if (fs.existsSync(latestBackupDir)) {
        fs.rmSync(latestBackupDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(backupDir);
    fs.mkdirSync(latestBackupDir);
    
    const files = fs.readdirSync('.');
    for (const file of files) {
        if (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js') && file !== 'index.js') {
            // Excluding node_modules and just taking static files or the primary scripts
            // Let's just back up all HTML, CSS, frontend JS. We can do a simple check.
            const isFrontend = file.includes('html') || file.includes('css') || 
                ['app.js', 'script.js', 'api.js', 'auth.js', 'cultivo.js', 'inventario.js', 'ventas.js', 'insumos.js', 'tareas.js', 'dashboard.js'].includes(file);
                
            if (isFrontend) {
                fs.copyFileSync(file, path.join(backupDir, file));
                fs.copyFileSync(file, path.join(latestBackupDir, file));
            }
        }
    }
    console.log(`\nCopia de seguridad de la App Web creada en las carpetas: ${backupDir}/ y ${latestBackupDir}/`);
} catch(e) {
    console.error('Error al respaldar la App Web:', e);
}

console.log('\n✅ Proceso de Backup Completado.');
