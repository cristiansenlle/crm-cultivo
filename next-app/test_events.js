const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opnjrzixsrizdnphbjnq.supabase.co';
const supabaseKey = 'HIDDEN_SECRET_BY_AI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: bData, error } = await supabase.from('core_agronomic_events').select('*').limit(5);
  if(error) console.error("Error core_agronomic_events:", error);
  else console.log("core_agronomic_events count:", bData.length, bData[0]);

  const { data: bData2, error: error2 } = await supabase.from('agronomic_events').select('*').limit(5);
  if(error2) console.error("Error agronomic_events:", error2);
  else console.log("agronomic_events count:", bData2?.length, bData2?.[0]);
}

check();
