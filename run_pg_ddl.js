const { Client } = require('pg');

async function runDDL() {
    const client = new Client({
        host: 'db.opnjrzixsrizdnphbjnq.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'Fn@calderon6193',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log("Connected to Supabase.");

        await client.query(`
            ALTER TABLE public.core_batches ADD COLUMN IF NOT EXISTS num_plants numeric DEFAULT 0;
            ALTER TABLE public.core_agronomic_events ADD COLUMN IF NOT EXISTS water_liters numeric DEFAULT 0;
            ALTER TABLE public.core_agronomic_events ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;
        `);
        console.log("SQL Columns injected successfully!");

    } catch (e) {
        console.error("PG Error:", e.message);
    } finally {
        await client.end();
    }
}

runDDL().catch(console.error);
