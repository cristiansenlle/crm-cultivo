const { Client } = require('pg');

async function run() {
    const connectionString = 'postgresql://postgres:Fn@calderon6193@db.opnjrzixsrizdnphbjnq.supabase.co:5432/postgres';
    
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase direct connections
    });

    try {
        await client.connect();
        console.log("Connected successfully to Supabase!");

        const ddl = `
        CREATE TABLE IF NOT EXISTS public.core_protocols (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            stage TEXT NOT NULL,
            topic TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE public.core_protocols ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if any to avoid errors
        DROP POLICY IF EXISTS "Allow anonymous read all" ON public.core_protocols;
        DROP POLICY IF EXISTS "Allow anonymous insert" ON public.core_protocols;
        DROP POLICY IF EXISTS "Allow anonymous update" ON public.core_protocols;
        DROP POLICY IF EXISTS "Allow anonymous delete" ON public.core_protocols;

        CREATE POLICY "Allow anonymous read all" 
        ON public.core_protocols FOR SELECT USING (true);

        CREATE POLICY "Allow anonymous insert" 
        ON public.core_protocols FOR INSERT WITH CHECK (true);

        CREATE POLICY "Allow anonymous update" 
        ON public.core_protocols FOR UPDATE USING (true);

        CREATE POLICY "Allow anonymous delete" 
        ON public.core_protocols FOR DELETE USING (true);
        `;

        await client.query(ddl);
        console.log("Protocol Table Created successfully!");

    } catch (e) {
        console.error("Connection/Query Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
