const supabaseUrl = "https://dvvfdsaqvcyftaaronhd.supabase.co";
const supabaseKey = "HIDDEN_SECRET_BY_AI";

// REST APIs cannot run DDL commands directly.
// We must instruct the user to run this SQL in their Supabase console manually.
console.log(`
=========================================
ATENCIÓN REQUERIDA EN SUPABASE:
=========================================
El sistema de seguridad local bloquea la ejecución de NPM. 
Por favor, entra a tu panel de Supabase:
1. Ve a "SQL Editor"
2. Pega y ejecuta el siguiente código:

ALTER TABLE public.core_sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT 'Consumidor Final';

=========================================
`);
