const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function hackSupa() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

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

DROP POLICY IF EXISTS "Allow anonymous read all" ON public.core_protocols;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.core_protocols;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.core_protocols;
DROP POLICY IF EXISTS "Allow anonymous delete" ON public.core_protocols;

CREATE POLICY "Allow anonymous read all" ON public.core_protocols FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON public.core_protocols FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON public.core_protocols FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON public.core_protocols FOR DELETE USING (true);
`;

    // Write a node script on the VPS to connect using pg
    const remoteScript = `
const { Client } = require('pg');

const run = async () => {
    // Try port 5432 and 6543
    const hosts = [
        'db.opnjrzixsrizdnphbjnq.supabase.co',
        'aws-0-us-east-1.pooler.supabase.com'
    ];
    
    // In Supabase, usually the direct db is db.<ref>.supabase.co:5432
    // Let's try direct connection
    const client = new Client({
        connectionString: 'postgresql://postgres:Fn@calderon6193@db.opnjrzixsrizdnphbjnq.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected directly!");
        await client.query(\`${ddl.replace(/`/g, '\\`')}\`);
        console.log("DDL EXECUTED!");
    } catch (e) {
        console.error("Direct connection failed:", e.message);
    } finally {
        await client.end();
    }
};
run();
`;

    // Install pg in /tmp on VPS and run script
    const installCmd = await ssh.execCommand('cd /tmp && npm install pg && cat << "EOF" > /tmp/run_supa.js\n' + remoteScript + '\nEOF\nnode /tmp/run_supa.js');
    console.log("Output:");
    console.log(installCmd.stdout);
    if(installCmd.stderr) console.error("Error:", installCmd.stderr);

    ssh.dispose();
}

hackSupa().catch(console.error);
