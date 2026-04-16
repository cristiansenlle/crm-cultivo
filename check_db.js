const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opnjrzixsrizdnphbjnq.supabase.co';
const supabaseKey = 'HIDDEN_SECRET_BY_AI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('core_batches').select('*').limit(1);
  if(error) console.error(error);
  else console.log("Core Batches columns:", Object.keys(data[0]), data[0]);
}

check();
