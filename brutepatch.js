const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function bruteForcePatch() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        try {
            console.log("Stopping PM2...");
            execSync('pm2 stop n8n');
            
            console.log("Extracting current live nodes...");
            execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/bruteforce_nodes.json');
            
            let nodesStr = fs.readFileSync('/tmp/bruteforce_nodes.json', 'utf8');
            let nodes = JSON.parse(nodesStr);
            
            console.log("Injecting violent fixes...");
            let patchedLotes = 0;
            let patchedRooms = 0;
            let patchedTeleList = 0;
            let patchedTeleLoad = 0;

            for (let node of nodes) {
                if(node.name.includes('consultar_lotes')) {
                    node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,core_rooms(name)&order=id.asc";
                    node.parameters.description = "LISTA LOS LOTES DE PLANTAS (Batches/Genéticas). NO devuelve Salas. Devuelve el inventario vivo de plantas a qué sala pertenecen.";
                    patchedLotes++;
                }
                
                if(node.name.includes('consultar_salas')) {
                    node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=id,name,phase";
                    node.parameters.description = "Lista NOMBRES FÍSICOS DE LAS SALAS O CARPAS (Rooms) del cultivo y obtener sus UUIDs reales.";
                    node.parameters.placeholderDefinitions = {
                         values: [{ name: "filtro_opcional", description: "Vacio.", type: "string" }]
                    };
                    patchedRooms++;
                }

                if(node.name.includes('cargar_telemetria')) {
                    node.parameters.description = "Registra telemetría (temperatura y humedad) en una Sala. REQUIERE UUID real (ej: 2de32401-...), NUNCA texto.";
                    // Nuke parameter names like sala-1
                    if (node.parameters.placeholderDefinitions && node.parameters.placeholderDefinitions.values) {
                        node.parameters.placeholderDefinitions.values.forEach(param => {
                            if(param.name === 'sala_o_lote' || param.name === 'room_id' || param.name === 'batch_id') {
                                param.description = 'OBLIGATORIO: UUID real. JAMAS USES NOMBRES COMO "sala-1" O "Carpa 1". Usa SÓLO el UUID.';
                            }
                        });
                    }
                    patchedTeleLoad++;
                }

                if(node.name.includes('consultar_telemetria')) {
                     node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/daily_telemetry?select=temperature_c,humidity_percent,created_at,core_rooms(name)&order=created_at.desc&limit=10";
                     patchedTeleList++;
                }
            }

            console.log(\`Patched! Lotes: \${patchedLotes}, Rooms: \${patchedRooms}, TeleList: \${patchedTeleList}, TeleLoad: \${patchedTeleLoad}\`);
            
            const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
            const sql = \`UPDATE workflow_entity SET nodes = '\${escNodes}' WHERE id = 'scpZdPe5Cp4MG98G';\`;
            fs.writeFileSync('/tmp/bruteforce_update.sql', sql);
            
            console.log("Applying to SQLite...");
            execSync('sqlite3 /root/.n8n/database.sqlite < /tmp/bruteforce_update.sql');
            
            console.log("Starting PM2...");
            execSync('pm2 start n8n');
            console.log("DONE!");
            
        } catch (e) {
             console.log("ERROR:", e.message);
        }
        `;
        
        await ssh.execCommand('cat > /tmp/brutepatch.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/brutepatch.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
bruteForcePatch();
