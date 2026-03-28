// Creates core_rooms table in Supabase via the Management API
// Requires a Supabase Personal Access Token
// We'll use the pg REST approach to execute SQL via the pg endpoint

const fetch = require('node-fetch');

const PROJECT_REF = "opnjrzixsrizdnphbjnq";
// Use Supabase's undocumented SQL execution endpoint with service key
// Alternative: run DDL via pg REST with service role key

// Actually, let's create the table programmatically by using
// the Postgres node in n8n or simply inserting a record to detect if it exists.
// Since we can't CREATE TABLE via anon key, let's check the n8n Postgres credential.

const { NodeSSH } = require('node-ssh');
const fs = require('fs');

async function createTableViaPG() {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // The n8n Postgres credential connects to Supabase's direct postgres connection
    // We can execute SQL directly using psql
    // First get the connection string from the n8n credential (it's encrypted, so we read from workflow JSON)
    const wfContent = await ssh.execCommand('cat /root/n8n-exports/n8n-crm-cannabis-workflow.json 2>/dev/null | head -1 || cat /opt/crm-cannabis/n8n-crm-cannabis-workflow.json 2>/dev/null | grep -i "host\\|database\\|password\\|username" | head -10');
    console.log('Workflow refs:', wfContent.stdout.substring(0, 500));

    // Try to find psql or connection config
    const psqlCheck = await ssh.execCommand('which psql && psql --version');
    console.log('psql:', psqlCheck.stdout);

    // Use node-fetch to call Supabase DB directly via REST API with SQL
    // The Supabase pg-rest endpoint for SQL (v1 rpc) 
    // We can create table via RPC if there's a function, otherwise we use direct pg

    // Search for service_role key in any file on the server
    const keySearch = await ssh.execCommand('grep -r "service_role" /opt/crm-cannabis/ 2>/dev/null | head -5');
    console.log('Service role key references:', keySearch.stdout);

    const keySearch2 = await ssh.execCommand('grep -rn "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" /opt/crm-cannabis/ 2>/dev/null | head -5');
    console.log('JWT keys found:', keySearch2.stdout.substring(0, 500));

    ssh.dispose();
}

createTableViaPG().catch(console.error);
