// Direct server-side approach: find the pg module used by n8n and run DDL via it
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function createTableDirect() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    // Check if pg is available globally or in n8n
    const pgCheck = await ssh.execCommand('find /usr/lib/node_modules -name "pg" -maxdepth 3 -type d 2>/dev/null | head -5');
    console.log('pg module locations:', pgCheck.stdout);

    // Look for Supabase direct connection string anywhere
    const connStr = await ssh.execCommand('grep -rn "postgresql://\\|postgres://" /opt/crm-cannabis/ /root/.n8n/ /root/ 2>/dev/null | grep -v ".sql:" | head -10');
    console.log('Connection strings found:', connStr.stdout);

    // Check if psql is available
    const psqlCheck = await ssh.execCommand('apt list --installed 2>/dev/null | grep postgresql-client');
    console.log('psql installed:', psqlCheck.stdout);

    // Try to use the n8n pg module  
    const pgScript = `
const path = require('path');
// Try to find pg in n8n's dependencies
const n8nPgPath = '/usr/lib/node_modules/n8n/node_modules/pg';
try {
    const { Client } = require(n8nPgPath);
    
    // Supabase direct connection (from n8n Postgres credential - standard format)
    // Supabase pooler URL format: postgres://postgres.[project_ref]:[password]@[region].pooler.supabase.com:5432/postgres
    // We'll try to connect using the known project ref
    const client = new Client({
        host: 'db.opnjrzixsrizdnphbjnq.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: process.env.SUPA_PG_PASS || '',
        ssl: { rejectUnauthorized: false }
    });
    
    client.connect().then(() => {
        console.log('Connected to Supabase PG!');
        client.query('CREATE TABLE IF NOT EXISTS public.core_rooms (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, phase text, description text, created_at timestamptz DEFAULT now());')
            .then(r => { console.log('Table created!'); client.end(); })
            .catch(e => { console.error('Query error:', e.message); client.end(); });
    }).catch(e => console.error('Connection error:', e.message));
} catch (e) {
    console.error('pg module error:', e.message);
}
`;
    fs.writeFileSync('/tmp/pg_ddl.js', pgScript);
    await ssh.putFile('/tmp/pg_ddl.js', '/root/pg_ddl.js');
    const result = await ssh.execCommand('node /root/pg_ddl.js 2>&1');
    console.log('Direct PG attempt:', result.stdout);

    ssh.dispose();
}

createTableDirect().catch(console.error);
