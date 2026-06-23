# CANNABIS-CORE 360 OS - Agrotech Architecture Plan

Bienvenido al diseño arquitectónico de **CANNABIS-CORE 360 OS**. Este documento define la estructura de datos, integración IoT con n8n y la base UI/UX para el dashboard.

## User Review Required

> [!IMPORTANT]
> Por favor revisa el esquema de la base de datos y los endpoints propuestos. Si son correctos, procederé a implementar la interfaz web (HTML/CSS/JS) del dashboard de control.

---

## 1. Arquitectura de Datos (Database Schema)

El siguiente esquema relacional PostgreSQL consolida la gestión agrícola integral, cálculos dinámicos de post-cosecha y un CRM robusto para Punto de Venta (POS).

```sql
-- Gestión Técnica (El Cultivo)

CREATE TABLE strains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    lineage VARCHAR(150),
    thc_percent NUMERIC(5,2),
    cbd_percent NUMERIC(5,2),
    type VARCHAR(50) -- AUTO, FEMINIZED, REGULAR
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strain_id UUID REFERENCES strains(id),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_harvest_date DATE,
    growth_stage VARCHAR(50) DEFAULT 'VEGETATIVE', -- SEEDLING, VEGETATIVE, FLOWERING, HARVESTED
    qr_history_url TEXT 
);

CREATE TABLE daily_telemetry (
    id BIGSERIAL PRIMARY KEY,
    batch_id UUID REFERENCES batches(id),
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature_c NUMERIC(5,2),
    humidity_percent NUMERIC(5,2),
    co2_ppm INTEGER,
    ec_ms NUMERIC(5,2),
    ph_in NUMERIC(4,2),
    ph_out NUMERIC(4,2),
    vpd_kpa NUMERIC(5,2) -- Válido para calcular dinámicamente si falta
);

-- Post-Cosecha y Trazabilidad

CREATE TABLE harvests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id),
    harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    wet_weight_g NUMERIC(10,2) NOT NULL,
    dry_weight_g NUMERIC(10,2), -- Updated after curing
    shrinkage_percent NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN wet_weight_g > 0 AND dry_weight_g IS NOT NULL 
        THEN ((wet_weight_g - dry_weight_g) / wet_weight_g) * 100 
        ELSE NULL END
    ) STORED
);

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    harvest_id UUID REFERENCES harvests(id),
    product_type VARCHAR(50), -- PREMIUM_FLOWER, SMALL_BUDS, TRIM, EXTRACT
    available_grams NUMERIC(10,2) NOT NULL,
    production_cost_per_g NUMERIC(10,2) -- Dinámico según costos operativos del batch
);

-- Gestión Comercial (CRM y Punto de Venta)

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(50),
    preferential_price_tier VARCHAR(50) DEFAULT 'STANDARD' -- STANDARD, VIP, WHOLESALE
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_price NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED'
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id),
    inventory_id UUID REFERENCES inventory(id),
    grams_sold NUMERIC(10,2) NOT NULL,
    unit_price_per_g NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) GENERATED ALWAYS AS (grams_sold * unit_price_per_g) STORED
);
```

---

## 2. Integración Nube n8n (Workflow CRM Cannabis)

Por requerimiento, toda la lógica de negocio y enlace de bases de datos se orquestará mediante un workflow de n8n previamente creado llamado **"crm cannabis"** (`ID: OHX5sTdDCbioSqiR`). Esto reemplaza la necesidad de correr un backend Express local, delegando el peso de operaciones CRUD y notificaciones a n8n.

### A. Endpoints Base (Webhooks n8n)

El frontend de CANNABIS-CORE 360 se comunicará directamente con los Webhooks expuestos por este workflow en n8n mediante llamadas HTTP asíncronas (`fetch` / `axios`).

El workflow "crm cannabis" deberá estructurarse para manejar el enrutamiento interno basado en parámetros HTTP POST o subrutas Webhook:

#### 1. Gestión de Entidades (CRUD Genérico)
*   `POST /webhook/crm-cannabis/entities`
    *   **Payload:** `{ action: 'CREATE', entity: 'strains', data: {...} }`
    *   **Payload:** `{ action: 'READ', entity: 'batches', filters: {...} }`
    *   **Lógica n8n:** Un nodo `Switch` que evalúe la acción, y nodos `Postgres` ejecutando las Querys al schema relacional definido en el punto 1.

#### 2. Recepción de Telemetría (IoT)
*   `POST /webhook/crm-cannabis/telemetry`
    *   **Payload:** `{ batch_id, temp, humidity, co2, ec, ph_in, ph_out }`
    *   **Lógica n8n:** 
        1. Recibe los datos.
        2. Ejecuta un nodo `Code` para calcular el VPD exacto.
        3. Inserta en la DB (tabla `daily_telemetry`).
        4. Si el VPD cruza umbrales, desencadena un nodo de `Push/Email` / WebSocket.

#### 3. Punto de Venta (Sales Flow)
*   `POST /webhook/crm-cannabis/sales`
    *   **Payload:** `{ customer_id, cart_items: [...], subtotal, discount, total }`
    *   **Lógica n8n:** 
        1. Valida stock en la DB.
        2. Deduce los items de `inventory` (Update).
        3. Registra la venta padre en `sales` e hijos en `sale_items`.
        4. Dispara un nodo `PDF Generator` o `Email` para enviar la factura al cliente.
        5. Retorna `{ success: true }` al Frontend.

---

## 3. Arquitectura UI/UX (Dashboard Inteligente)

### Estética Premium
*   **Tema:** Minimalista, Dark Mode (Fondos `#121212`, Paneles `#1E1E1E`). 
*   **Tipografía:** Inter o Roboto para máxima legibilidad.
*   **Acentos:** Glow interactivo en los "Widgets de Estado" (Verde neón para Normal, Amarillo ámbar para Warning, y Rojo pulsante para Emergencia).

### Layout Modular
1.  **Live Grow Room:** Gráficas en tiempo real (Chart.js / Recharts) con la curva de VPD actualizada cada 5 minutos.
2.  **Task Manager:** Lista Kanban/Calendario con tareas urgentes generadas / empujadas desde n8n.
3.  **Sales & Inventory:** Tarjetas de métricas rápidas (Stock disponible, Pipeline).
4.  **Financial Health:** KPIs rápidos sobre Opex vs Ingresos de cosecha.

## Verification Plan

### Manual Verification
1.  Revisar que la fórmula de VPD sea médicamente exacta y arroje rangos en kPa.
2.  Desarrollar el frontend (HTML/CSS/JS) y simular envíos de telemetría con estatus visual de Emergencia.
3.  Comprobar que los "glow" de los bordes del Dashboard cambien dinámicamente frente a valores de Temperatura > 30.
