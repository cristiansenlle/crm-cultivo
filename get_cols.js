const SUPABASE_URL = "https://opnjrzixsrizdnphbjnq.supabase.co";
const SUPABASE_ANON_KEY = "HIDDEN_SECRET_BY_AI";

async function getCols() {
    // We can query the OpenAPI spec of PostgREST to see all tables and columns
    const url = `${SUPABASE_URL}/rest/v1/`;
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();

        console.log("=== COLUMNS FOR daily_telemetry ===");
        const tableSchema = data.definitions['daily_telemetry'];
        if (tableSchema && tableSchema.properties) {
            Object.keys(tableSchema.properties).forEach(col => {
                console.log(col, 'type:', tableSchema.properties[col].type);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

getCols();
