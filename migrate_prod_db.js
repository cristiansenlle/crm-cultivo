const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const scriptContent = `
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:Fn%40calderon6193@db.opnjrzixsrizdnphbjnq.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to PG!');
  
  const sql = \`
    -- 1) Create the new table for Sensors
    CREATE TABLE IF NOT EXISTS public.core_sensors (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL,
        room_id UUID REFERENCES public.core_rooms(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 2) Alter daily_telemetry to include optional sensor reference
    ALTER TABLE public.daily_telemetry 
    ADD COLUMN IF NOT EXISTS sensor_id UUID REFERENCES public.core_sensors(id) ON DELETE SET NULL;

    -- 3) Auto-migrate old data! We need to create a default sensor for each existing room.
    DO \\$\\$
    DECLARE
        r RECORD;
        new_sensor_id UUID;
    BEGIN
        FOR r IN SELECT id FROM public.core_rooms LOOP
            IF NOT EXISTS (SELECT 1 FROM public.core_sensors WHERE room_id = r.id) THEN
                INSERT INTO public.core_sensors (name, room_id)
                VALUES ('Sensor Principal - ' || substr(r.id::text, 1, 4), r.id)
                RETURNING id INTO new_sensor_id;
                
                UPDATE public.daily_telemetry
                SET sensor_id = new_sensor_id
                WHERE room_id::text = r.id::text AND sensor_id IS NULL;
            END IF;
        END LOOP;
    END \\$\\$;
  \`;
  
  await client.query(sql);
  console.log('Migration executed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Error executing migration:', err);
  process.exit(1);
});
`;

async function main() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    // Create the script remotely using base64 encoded string to avoid escape issues
    const base64Code = Buffer.from(scriptContent).toString('base64');
    
    await ssh.execCommand('echo ' + base64Code + ' | base64 -d > /root/run_migration.js');
    
    console.log('Installing pg...');
    let npm = await ssh.execCommand('npm install pg', {cwd: '/root'});
    
    console.log('Executing migration script...');
    let exec = await ssh.execCommand('node /root/run_migration.js', {cwd: '/root'});
    
    console.log('STDOUT:', exec.stdout);
    console.log('STDERR:', exec.stderr);
    
    ssh.dispose();
}
main().catch(console.error);
