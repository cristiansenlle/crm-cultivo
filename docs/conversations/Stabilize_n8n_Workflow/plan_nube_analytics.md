# Plan de Implementación: Base de Datos Cloud y Analytics (Fases 11-12-13)

La meta de esta integración es migrar el comportamiento "Offline-First" actual (`localStorage`) hacia la base de datos central PostgreSQL en la nube (Supabase). Esto permitirá la interoperabilidad en vivo entre la aplicación web, el asistente de WhatsApp (n8n API) y la generación de reportes a futuro.

## User Review Required

> [!WARNING]
> La migración a la nube reemplazará de forma permanente el origen de datos de tu inventario local. Crearemos tres tablas troncales de facturación y control. Si estás de acuerdo con la estructura descrita abajo, aprobalo para que inyecte los comandos SQL en el servidor.

## Proposed Changes

### 1. Esquema de Base de Datos PostgreSQL (Supabase)

Crearemos tablas para reemplazar las variables que actualmente viven en LocalStorage de manera transaccional:

#### [NEW] Tabla `core_inventory_quimicos`
- `id` (UUID, primary key)
- `name` (varchar) (Ej: "Oro Negro")
- `type` (varchar) (fertilizante, sustrato, etc.)
- `qty` (numeric) (Cantidad en mL o g)
- `min_stock` (numeric) (Umbral de alerta)
- `last_updated` (timestamptz)

#### [NEW] Tabla `core_inventory_cosechas`
- `id` (varchar, primary key) (Ej: "A01-16812")
- `name` (varchar)
- `type` (varchar) (Ej: cosecha_propia, compra_b2b)
- `qty` (numeric) (Stock de gramos disponibles)
- `price` (numeric) (Costo originario base)
- `date_added` (timestamptz)

#### [NEW] Tabla `core_sales` (Finanzas B2B)
- `id` (UUID)
- `tx_id` (varchar)
- `date` (timestamptz)
- `item_id` (varchar)
- `qty_sold` (numeric)
- `revenue` (numeric)
- `cost_of_goods` (numeric)
- `client` (varchar)

### 2. Frontend en el Navegador

#### [MODIFY] `insumos.js`, `pos.js`, y `cultivo.js`
- Se reemplazarán todas las sentencias `localStorage.getItem` y `setItem` por peticiones asíncronas `fetch` apuntando directamente a la API RESTful de Supabase, validando con su `anon key`.

#### [NEW] `analytics.html` y `analytics.js` (Fase 11)
- **Módulo ROI**: Gráficas de Barra cruzando costos de insumos vs ganancias de las ventas.
- **Módulo VPD**: Gráfica Lineal de `daily_telemetry` usando *Chart.js*.
- **Exportación PDF**: Botón "Pasaporte de Cosecha" para descargar el resumen de una sala específica (usando *html2pdf*).

## Verification Plan

### Automated Tests
- Ejecutaré scripts de inserción directa a la API de Supabase para comprobar que RLS está configurado correctamente para permitir lectura/escritura anónima (o proveeremos headers).

### Manual Verification
- Te pediré que entres a la interfaz de Ventas e intentes generar una transacción, verificando si esta disminuye el inventario alojado en tu Dashboard de Supabase online, y que aparezca en la ventana "Analytics" recién estrenada.
