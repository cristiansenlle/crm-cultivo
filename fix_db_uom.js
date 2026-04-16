const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    // Ejecutar psql
    const cmds = `
export PGPASSWORD="Fn@calderon6193"
psql -h db.opnjrzixsrizdnphbjnq.supabase.co -U postgres -d postgres -p 5432 -c "
DO \\$\\$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_inventory_quimicos' AND column_name='uom') THEN
        ALTER TABLE core_inventory_quimicos ADD COLUMN uom VARCHAR(20) DEFAULT 'unidades';
        
        -- Retro-popular data
        UPDATE core_inventory_quimicos SET uom = 'ml' WHERE type ILIKE '%fertilizer%' OR type ILIKE '%fertilizante%';
        UPDATE core_inventory_quimicos SET uom = 'gr' WHERE type ILIKE '%pesticide%' OR type ILIKE '%pesticida%' OR type ILIKE '%fungicida%';
        UPDATE core_inventory_quimicos SET uom = 'unidades' WHERE uom IS NULL;
    END IF;
END \\$\\$;
"
    `;
    const res = await ssh.execCommand(cmds);
    console.log("Salida de ALTER TABLE:", res.stdout);
    if(res.stderr) console.error("Errores:", res.stderr);
    ssh.dispose();
}
run();
