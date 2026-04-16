const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function dbPatch() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const sql = `
        ALTER TABLE public.core_batches ADD COLUMN IF NOT EXISTS num_plants numeric DEFAULT 0;
        ALTER TABLE public.core_agronomic_events ADD COLUMN IF NOT EXISTS water_liters numeric DEFAULT 0;
        ALTER TABLE public.core_agronomic_events ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;
    `;
    
    // Pass raw SQL securely into psql on the VPS using EOF
    const cmd = `cat << 'EOF' | psql "postgres://postgres:Fn%40calderon6193@db.opnjrzixsrizdnphbjnq.supabase.co:5432/postgres"\n${sql}\nEOF`;

    const res = await ssh.execCommand(cmd);
    console.log('Done:', res.stdout);
    if (res.stderr) console.error('Error:', res.stderr);

    ssh.dispose();
}

dbPatch().catch(console.error);
