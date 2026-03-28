const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function createTableViaN8nCLI() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log("Generating temporary workflow payload...");
    const ddlWorkflow = {
        "id": "1",
        "name": "DDL Execute Temp",
        "active": false,
        "nodes": [
            {
                "parameters": {},
                "id": "start-node",
                "name": "Start",
                "type": "n8n-nodes-base.manualTrigger",
                "typeVersion": 1,
                "position": [ 200, 300 ]
            },
            {
                "parameters": {
                    "operation": "executeQuery",
                    "query": "CREATE TABLE IF NOT EXISTS public.core_protocols (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, title TEXT NOT NULL, stage TEXT, topic TEXT, content TEXT, created_at TIMESTAMPTZ DEFAULT now());"
                },
                "id": "pg-ddl-node",
                "name": "Postgres Execute",
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.5,
                "position": [ 400, 300 ],
                "credentials": {
                    "postgres": {
                        "id": "yfBYokjK02D81bok",
                        "name": "Postgres account"
                    }
                }
            }
        ],
        "connections": {
            "Start": {
                "main": [
                    [
                        {
                            "node": "Postgres Execute",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            }
        },
        "settings": {
            "executionOrder": "v1"
        }
    };

    const pyUploader = `
import json
with open('/tmp/ddl_workflow.json', 'w') as f:
    f.write(json.dumps(${JSON.stringify(ddlWorkflow)}))
`;
    await ssh.execCommand(`cat > /tmp/gen_wf.py << 'EOF'\n${pyUploader}\nEOF`);
    await ssh.execCommand('python3 /tmp/gen_wf.py');

    console.log("Stopping PM2 n8n-service temporarily...");
    await ssh.execCommand('pm2 stop n8n-service');
    
    // Give it a second to free up the port
    await new Promise(r => setTimeout(r, 2000));

    console.log("Executing via n8n CLI...");
    const result = await ssh.execCommand('n8n execute --file /tmp/ddl_workflow.json', { cwd: '/root' });
    
    console.log('--- STDOUT ---');
    console.log(result.stdout);
    console.log('--- STDERR ---');
    console.log(result.stderr);

    if (result.stdout.includes('Successfully completed') || result.stdout.includes('Success')) {
         console.log('✅ core_protocols table successfully created!');
    } else {
         console.log('❌ Something might have failed.');
    }

    console.log("Restarting PM2 n8n-service...");
    await ssh.execCommand('pm2 start n8n-service');

    await ssh.execCommand('rm /tmp/ddl_workflow.json /tmp/gen_wf.py');
    ssh.dispose();
}

createTableViaN8nCLI().catch(console.error);
