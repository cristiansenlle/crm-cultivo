const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function wipeLegacyWorkflow() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        const legacyId = 'yC1ekEMc12CkBmwH';
        
        console.log('--- Database Tables ---');
        const tablesRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite ".tables"');
        console.log('Tables:', tablesRes.stdout);
        const tables = tablesRes.stdout.split(/\s+/).filter(t => t.length > 0);

        console.log(`--- Wiping ID ${legacyId} from all tables ---`);
        for (const table of tables) {
            // We check if the table has a column related to workflowId or id
            const colRes = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "PRAGMA table_info(${table});"`);
            const cols = colRes.stdout;
            
            let deleteQuery = '';
            if (cols.includes('|id|')) {
                deleteQuery = `DELETE FROM ${table} WHERE id = '${legacyId}';`;
            } else if (cols.includes('|workflowId|')) {
                deleteQuery = `DELETE FROM ${table} WHERE workflowId = '${legacyId}';`;
            }

            if (deleteQuery) {
                console.log(`Executing: ${deleteQuery}`);
                await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "${deleteQuery}"`);
            }
        }

        console.log('--- Restarting n8n ---');
        await ssh.execCommand('pm2 restart n8n-service');
        
        console.log('Wipe complete.');
        ssh.dispose();
    } catch (err) {
        console.error('Wipe failed:', err.message);
    }
}

wipeLegacyWorkflow();
