const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS core_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES core_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_telemetry ADD COLUMN IF NOT EXISTS sensor_id UUID REFERENCES core_sensors(id) ON DELETE SET NULL;

INSERT INTO core_sensors (room_id, name)
SELECT id, 'Sensor por defecto 1' FROM core_rooms
WHERE id NOT IN (SELECT room_id FROM core_sensors);

UPDATE daily_telemetry dt
SET sensor_id = cs.id
FROM core_sensors cs
WHERE dt.room_id = cs.room_id AND dt.sensor_id IS NULL;
`;

const wf = {
  name: "DB Deploy",
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

async function deploy() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const wfJson = JSON.stringify(wf, null, 2);
    await ssh.execCommand(`echo '${wfJson.replace(/'/g, "'\\''")}' > /root/temp_db_deploy.json`);
    
    console.log('Running workflow...');
    let res = await ssh.execCommand('n8n execute --file /root/temp_db_deploy.json');
    console.log(res.stdout);
    if (res.stderr) console.error("ERR:", res.stderr);

    ssh.dispose();
}

deploy().catch(console.error);
