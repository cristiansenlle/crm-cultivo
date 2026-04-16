
-- WARNING: This will delete ALL data from the core CRM tables.
TRUNCATE TABLE public.core_agronomic_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.core_telemetry RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.core_sales RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.core_inventory_insumos RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.core_inventory_cosechas RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.core_batches RESTART IDENTITY CASCADE;

