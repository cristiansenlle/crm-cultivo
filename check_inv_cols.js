const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    // Ejecutar psql con contraseña
    const res = await ssh.execCommand(`
export PGPASSWORD="Fn@calderon6193"
psql -h db.opnjrzixsrizdnphbjnq.supabase.co -U postgres -d postgres -p 5432 -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'core_inventory_quimicos';"
    `);
    console.log(res.stdout);
    ssh.dispose();
}
run();
