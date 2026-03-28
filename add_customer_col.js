const supabaseUrl = "https://dvvfdsaqvcyftaaronhd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZkc2FxdmN5ZnRhYXJvbmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDAzMzksImV4cCI6MjA4NzQ3NjMzOX0.u6LeadPF3nqYq3Rb09ykVN_9Gbf80VCcWc8nEYwmJgk";

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
