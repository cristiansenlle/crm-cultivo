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
  name: "DB Deploy 4",
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
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const wfJson = JSON.stringify(wf, null, 2);
    await ssh.execCommand(`echo '${wfJson.replace(/'/g, "'\\''")}' > /root/temp_wf.json`);
    let imp = await ssh.execCommand('n8n import:workflow --input=/root/temp_wf.json');
    console.log("Import:", imp.stdout);

    // we will fetch all IDs and names as CSV and split in JS
    let sq = await ssh.execCommand('sqlite3 /root/.n8n/database.sqlite "SELECT id, name FROM workflow_entity;"');
    let lines = sq.stdout.split('\\n');
    let wfId = null;
    for(let l of lines) {
        if(l.includes('DB Deploy 4')) {
            wfId = l.split('|')[0];
            break;
        }
    }
    console.log("WF ID:", wfId);

    if (wfId) {
        await ssh.execCommand('pm2 stop n8n-service');
        let ex = await ssh.execCommand('n8n execute --id=' + wfId);
        console.log("Exec STDOUT:", ex.stdout);
        console.log("Exec STDERR:", ex.stderr);
        await ssh.execCommand('pm2 start n8n-service');
    }
    ssh.dispose();
}
run().catch(console.error);
