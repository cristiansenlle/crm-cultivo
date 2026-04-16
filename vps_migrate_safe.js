const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function migrate() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });
    
    const script = `
const { Client } = require('pg');
async function run() {
  try {
    const client = new Client({
      connectionString: 'postgresql://postgres:Fn%40calderon6193@db.opnjrzixsrizdnphbjnq.supabase.co:5432/postgres'
    });
    await client.connect();
    await client.query('ALTER TABLE core_batches ADD COLUMN IF NOT EXISTS num_plants numeric DEFAULT 0;');
    await client.query('ALTER TABLE core_batches ADD COLUMN IF NOT EXISTS flower_days numeric DEFAULT 60;');
    await client.query('ALTER TABLE core_agronomic_events ADD COLUMN IF NOT EXISTS water_liters numeric DEFAULT 0;');
    await client.query('ALTER TABLE core_agronomic_events ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;');
    console.log("MIGRATION SUCCESS");
    await client.end();
  } catch(e) {
    console.error("DB ERROR:", e);
  }
}
run();
`;

    // Local write
    fs.writeFileSync('c:/Users/Cristian/.gemini/antigravity/crm cannabis/migrate.js', script);

    // Upload script
    await ssh.putFile('c:/Users/Cristian/.gemini/antigravity/crm cannabis/migrate.js', '/root/migrate.js');
    
    // Install pg and run
    const result = await ssh.execCommand('npm install pg && node /root/migrate.js', { cwd: '/root' });
    console.log(result.stdout);
    if(result.stderr) console.error("STDERR:", result.stderr);
    
    ssh.dispose();
}

migrate().catch(console.error);
