# Mejoras POS y Corrección de PDF

- [x] Modificar `pos.html` para que el selector de cliente por defecto sea "Casual" y agregar un input para "Nombre del Cliente".
- [x] Modificar `pos.js` (`checkout` o `processSale`) para que lea y guarde el nombre del cliente en la base de datos de ventas.
- [x] (REQUIERE USUARIO) Ejecutar `ALTER TABLE public.core_sales ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT 'Consumidor Final';` en Supabase.
- [x] Crear un "Reporte de Ventas por Cliente" (posiblemente en `analytics.html` o un modal nuevo).
- [x] Investigar por qué no funciona la exportación a PDF del "Pasaporte de Lote" en `agronomy.html` / `agronomy.js`.
- [x] Implementar la librería `jspdf` o `html2pdf` para habilitar la descarga del certificado fitosanitario.
- [x] Verificar el correcto funcionamiento del generador de PDF.
