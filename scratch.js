const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    const query = "UPDATE core_batches SET light_hours = 18, dark_hours = 6 WHERE light_hours IS NULL;";
    const res = await ssh.execCommand(`export PGPASSWORD="Fn@calderon6193" && psql -h db.opnjrzixsrizdnphbjnq.supabase.co -U postgres -d postgres -p 5432 -c "${query}"`);
    console.log("StdOut:", res.stdout);
    console.log("StdErr:", res.stderr);
    ssh.dispose();
}
run();
