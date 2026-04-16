const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opnjrzixsrizdnphbjnq.supabase.co';
const supabaseKey = 'HIDDEN_SECRET_BY_AI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: bData, error } = await supabase.from('core_batches').select('*').limit(1);
  if(error) console.error(error);
  else console.log("Core Batches columns:", Object.keys(bData[0] || {}));
  
  console.log("\nEjemplo:", bData[0]);
}

check();
