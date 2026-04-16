
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
