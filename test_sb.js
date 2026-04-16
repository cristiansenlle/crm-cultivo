const { createClient } = require('@supabase/supabase-js');
const sbUrl = "https://opnjrzixsrizdnphbjnq.supabase.co";
const sbKey = "HIDDEN_SECRET_BY_AI";
const sb = createClient(sbUrl, sbKey);

async function check() {
    let res = await sb.from('core_rooms').select('*');
    console.log("Salas:", res.data?.length, res.data);

    let res2 = await sb.from('core_inventory').select('*').limit(2).catch(()=>null);
    if (res2 && res2.data) console.log("Inventory:", res2.data);
    else {
        let res3 = await sb.from('insumos_materiaprima').select('*').limit(2);
        console.log("insumos:", res3.data);
    }
}
check();
