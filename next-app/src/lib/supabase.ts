import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Evita que la app entera se caiga al arrancar si no hay claves. 
// Tirará el error solo cuando intentes hacer una consulta a la BD.
export const supabase = (supabaseUrl && supabaseKey) 
  ? createBrowserClient(supabaseUrl, supabaseKey) 
  : null as any;

export const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan credenciales de Supabase en .env.local');
  }
  return supabase;
};
