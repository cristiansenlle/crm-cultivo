async function exploreSupabase() {
    const sbUrl = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/";
    const sbKey = "HIDDEN_SECRET_BY_AI";
    
    try {
        const response = await fetch(sbUrl + '?apikey=' + sbKey);
        const data = await response.json();
        
        console.log("=== Tablas Disponibles en la BD (Paths) ===");
        if (data && data.paths) {
            const tableNames = Object.keys(data.paths)
                                .filter(p => p !== '/' && !p.includes('rpc/'))
                                .map(p => p.replace('/', ''));
            console.log(tableNames.join('\n'));
            
            console.log("\n=== Evaluando Información de Insumos/Tareas ===");
            for (let table of tableNames) {
                if (table.toLowerCase().includes('invent') || table.toLowerCase().includes('insumo') || table.toLowerCase().includes('task') || table.toLowerCase().includes('tarea') || table.toLowerCase().includes('bodega')|| table.toLowerCase().includes('stock')) {
                    const rowRes = await fetch(sbUrl + table + '?select=*&limit=1', { headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey }});
                    const rows = await rowRes.json();
                    console.log(`\nTabla relacionada hallada: "${table}"`);
                    if(rows && rows.length > 0) {
                        console.log("Estructura base:", Object.keys(rows[0]));
                    } else {
                         console.log("(vacía)");
                    }
                }
            }
        }
    } catch(e) {
        console.error("Error fetching", e);
    }
}
exploreSupabase();
