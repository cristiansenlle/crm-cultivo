const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let u='', k='';
fs.readFileSync('next-app/.env.local', 'utf8').split('\n').forEach(l => {
  if (l.includes('NEXT_PUBLIC_SUPABASE_URL=')) u = l.split('=')[1].trim().replace(/"/g, '');
  if (l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) k = l.split('=')[1].trim().replace(/"/g, '');
});
const s = createClient(u, k);
s.from('devices').select('deviceId').then(r => {
  console.log(r.data.map(d => d.deviceId).join(','));
});
