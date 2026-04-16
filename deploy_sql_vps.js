const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function runSQL() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });
        
        console.log("Connected to VPS!");
        
        // 1. Upload the SQL File
        await ssh.putFile('c:/tmp/funcion_telemetria.sql', '/root/funcion_telemetria.sql');
        
        // 2. See if 'psql' is installed
        let psqlCheck = await ssh.execCommand('which psql');
        if (!psqlCheck.stdout) {
            console.log("psql not found. Installing postgresql-client...");
            await ssh.execCommand('apt-get update && apt-get install -y postgresql-client');
        }
        
        // 3. We need the specific PostgreSQL connection URI for Supabase.
        // It's in the standard format: postgres://postgres:password@db.project.supabase.co:5432/postgres
        // Or using pooler: postgres://postgres.project:password@aws-0-pooler:5432/postgres
        // Let's try direct IPv6 connection first (many VPS support it)
        console.log("Running SQL via psql...");
        
        const cmd = `PGPASSWORD="Fn@calderon6193" psql -h db.opnjrzixsrizdnphbjnq.supabase.co -U postgres -d postgres -f /root/funcion_telemetria.sql`;
        const result = await ssh.execCommand(cmd);
        
        console.log("STDOUT:", result.stdout);
        console.log("STDERR:", result.stderr);
        
        // If Direct connection fails due to IPv6 missing, try AWS-0-SA-EAST-1 Pooler explicitly, but with PgBouncer it usually needs port 6543
        if (result.stderr && result.stderr.includes('could not translate host name')) {
            console.log("Trying AWS-SA-EAST-1 pooler...");
            const cmdPool = `PGPASSWORD="Fn@calderon6193" psql -h aws-0-sa-east-1.pooler.supabase.com -p 5432 -U postgres.opnjrzixsrizdnphbjnq -d postgres -f /root/funcion_telemetria.sql`;
            const resultPool = await ssh.execCommand(cmdPool);
            console.log("POOL STDOUT:", resultPool.stdout);
            console.log("POOL STDERR:", resultPool.stderr);
             if (resultPool.stderr && resultPool.stderr.includes('not found')) {
                 console.log("Trying AWS-US-EAST-1 pooler...");
                 const cmdPool2 = `PGPASSWORD="Fn@calderon6193" psql -h aws-0-us-east-1.pooler.supabase.com -p 5432 -U postgres.opnjrzixsrizdnphbjnq -d postgres -f /root/funcion_telemetria.sql`;
                 const resultPool2 = await ssh.execCommand(cmdPool2);
                 console.log("POOL2 STDOUT:", resultPool2.stdout);
                 console.log("POOL2 STDERR:", resultPool2.stderr);
             }
        }
        console.log("Done.");
        
    } catch (err) {
        console.error("SSH Error:", err);
    } finally {
        ssh.dispose();
    }
}
runSQL();
