const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const sql = `
DO $$
BEGIN
CREATE TABLE IF NOT EXISTS public.core_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.core_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_telemetry ADD COLUMN IF NOT EXISTS sensor_id UUID REFERENCES public.core_sensors(id) ON DELETE SET NULL;

INSERT INTO public.core_sensors (room_id, name)
SELECT id, 'Sensor por defecto 1' FROM public.core_rooms
WHERE id NOT IN (SELECT room_id FROM public.core_sensors);

UPDATE public.daily_telemetry dt
SET sensor_id = cs.id
FROM public.core_sensors cs
WHERE dt.room_id = cs.room_id AND dt.sensor_id IS NULL;
END $$;
`;

const wf = {
  name: "DB Deploy 3",
  nodes: [
    {
      parameters: {},
      id: "1",
      name: "Start",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [240, 300]
    },
    {
      parameters: {
        operation: "executeQuery",
        query: sql
      },
      id: "2",
      name: "Postgres",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.1,
      position: [460, 300],
      credentials: {
        postgres: {
          id: "yfBYokjK02D81bok",
          name: "Postgres account"
        }
      }
    }
  ],
  connections: {
    "Start": {
      "main": [
        [
          { node: "Postgres", type: "main", index: 0 }
        ]
      ]
    }
  }
};

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const wfJson = JSON.stringify(wf, null, 2);
    await ssh.execCommand(`echo '${wfJson.replace(/'/g, "'\\''")}' > /root/temp_db_deploy3.json`);

    await ssh.execCommand('n8n import:workflow --input=/root/temp_db_deploy3.json');
    
    let dbRes = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id FROM workflow_entity WHERE name = \\\'DB Deploy 3\\\' ORDER BY \\"createdAt\\" DESC LIMIT 1;"');
    let wfId = dbRes.stdout.trim();
    
    if (wfId) {
        console.log("Stopping n8n-service...");
        await ssh.execCommand('pm2 stop n8n-service');
        
        console.log("Executing SQL migration via n8n by ID:", wfId);
        let execRes = await ssh.execCommand('n8n execute --id=' + wfId);
        console.log("Exec STDOUT:", execRes.stdout.substring(0,1500));
        if(execRes.stderr) console.error("Exec STDERR:", execRes.stderr);
        
        console.log("Starting n8n-service...");
        await ssh.execCommand('pm2 start n8n-service');
        
        // Remove temp workflows just to clean up
        await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "DELETE FROM workflow_entity WHERE name LIKE \\\'DB Deploy%\\\';"');
    }

    ssh.dispose();
}
run().catch(console.error);
