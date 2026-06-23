# Integración de Gráfico de Timeline Agronómico Avanzado

Este plan describe la arquitectura y los pasos necesarios para construir un nuevo submódulo dentro de **Analytics & ROI** que permita graficar cronológicamente la telemetría histórica del clima, intersecada con eventos clave del ciclo de vida de la planta (cambios fenológicos, aplicaciones, riegos y apariciones de plagas).

## Problema Actual
Actualmente poseemos registro histórico de clima (VPD y Temperatura) en la tabla `daily_telemetry`, pero no poseemos una estructura de base de datos que persista eventos específicos por lote o por sala (como la detección de una plaga o un riego específico). La telemetría es continua (líneas), pero los eventos son puntuales (puntos dispersos en el tiempo).

## Proposed Changes

### 1. Base de Datos (Supabase)
Necesitamos un repositorio de eventos inyectado en el backend.

#### [NEW] Nueva Tabla SQL: `core_agronomic_events`
- `id` (UUID, PK)
- `batch_id` (Relación al Lote en `core_inventory_cosechas`)
- `room_id` (Sala donde ocurrió, ej. 'sala1')
- `event_type` (Enum o Text: 'Fase', 'Plaga', 'Aplicacion', 'Riego', 'Info')
- `description` (Detalle: 'Aparición Araña Roja', 'Pase a Floración', 'Riego con FloraBloom')
- `date_occurred` (Timestamp)

---

### 2. Frontend de Registro (Cultivo)
Para nutrir ese gráfico, el operario debe poder registrar plagas u observaciones fácilmente.

#### [MODIFY] `cultivo.html` y `cultivo.js`
- Añadir un "Modal de Evento Agronómico" (Pop-up) en la vista de control de lotes.
- Permitirá seleccionar un Tipo de Evento (Plaga, Tarea Especial), añadir una nota, y un botón para Guardarlo directamente a Supabase (`core_agronomic_events`).
- Modificaremos la función `advanceStage` para que cuando el lote cambie de Vegetativo a Floración, también dispare un insert silencioso a la tabla de eventos notificando este cambio.

---

### 3. Frontend de Visualización (Dashboard Agronómico)
El núcleo del pedido: Gráficas dinámicas de "Tiempo vs Ambientación vs Eventos". Para evitar sobrecargar la sección de Finanzas, construiremos una pantalla totalmente independiente.

#### [NEW] `agronomy.html`
- Crear una nueva página en el menú lateral titulada "Timeline Agronómico" (o similar).
- Contendrá la estructura general (Sidebar, Topbar) y un contenedor majestuoso exclusivo para el `<canvas id="agronomicTimelineChart"></canvas>`.
- Agregar Selectores Globales de Filtro:
  - Selector de Lote Específico (Filtra la telemetría, tareas y eventos de ese lote exacto).
  - Selector de Sala (Filtra todo lo ocurrido en una sala).

#### [NEW] `agronomy.js`
- Integrar la petición asíncrona leyendo de tres fuentes simultáneamente:
  1. `daily_telemetry` (Registro de VPD y Temperatura).
  2. `core_agronomic_events` (Plagas, cambios fenológicos reportados manualmente).
  3. **Tareas Operativas (Calendario):** Consumir el origen histórico de tareas ejecutadas en ese Lote/Sala para sumarlas al gráfico.
- Utilizar un "Gráfico Mixto" de Chart.js (`type: 'scatter'` + `type: 'line'`):
  - **Dataset 1 (Líneas Continua):** Evolución del VPD a lo largo de los meses.
  - **Dataset 2 (Líneas Continua):** Evolución de la Temperatura.
  - **Dataset 3 (Puntos Scatter Grandes):** Eventos de Cambio de Fase (Color Azul).
  - **Dataset 4 (Puntos Scatter Triangulares):** Detección de Plagas/Enfermedades (Color Rojo de Alerta).
  - **Dataset 5 (Puntos Scatter Cuadrados):** Tareas / Aplicaciones (Color Verde).
  - Al posicionar el mouse sobre los Scatters (Tooltips), se desplegará el texto exacto (ej. "Detección Mildiú" o "Tratamiento Foliar Aplicado").

## Verification Plan

### Manual Verification
1. Generaremos la tabla en el backend asegurándonos de aplicar políticas (RLS) permisivas.
2. Ingresaremos a `cultivo.html`, simularemos avanzar la fase de un lote y "Botonear" la aparición de una Plaga desde el nuevo modal.
3. Ingresaremos a Finanzas, seleccionaremos dicho Lote y corroboraremos que sobre la curva de temperatura azul se dibuje un punto rojo que alerte sobre la fecha exacta de la plaga.
