import { createClient } from '@supabase/supabase-js';

// Usamos las credenciales extraídas de tu antiguo supabase-client.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opnjrzixsrizdnphbjnq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'HIDDEN_SECRET_BY_AI';

export const supabase = createClient(supabaseUrl, supabaseKey);
