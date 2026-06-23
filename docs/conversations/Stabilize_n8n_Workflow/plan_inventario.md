# Implementación Fase 10 & 13: Módulo de Bodega y Comercio (Inventario Unificado)

## Objetivo
Implementar un sistema centralizado de control de stock que gestione las **Entradas** (compras de insumos químicos y registro de cosechas propias/terceros) y valide las **Salidas** (consumo de fertilizantes por fertirriego y ventas de lotes secos por el POS).

## 1. Nueva UI: El Administrador de Bodega (`insumos.html`)
Se requiere una nueva vista principal en el menú (similar a `cultivo.html` o `tareas.html`) dedicada al inventario.

### Estructura de Pestañas (Tabs)
1. **Insumos Químicos**: Lista de Fertilizantes, Reguladores de pH, Sustratos. 
   - *Botonera*: "Ingresar Compra" (suma litros/ml al stock).
   - *Semáforo Visivo*: Rojo si `< 15%`, Amarillo, Verde.
2. **Cosecha Disponible (Stock B2B)**: Lista de Kilos/Gramos de "Flor Seca" o "Extractos" listos para vender.
   - Estos Lotes vendrán alimentados directamente desde la **Fase 9** (cuando la IA o el operario declara la Cosecha Seca) y desde un botón **"Compra Externa B2B"** (para añadir kilos comprados a terceros).

## 2. Refactorización del POS (`pos.html` / `pos.js`)
Actualmente el POS muestra cards estáticas (`Gelato #33`, `Sour Diesel`).
- **Lógica Dinámica**: `pos.js` debe hacer un `fetch` al iniciar para traer el array vigente de **Cosecha Disponible**.
- **Generación de Cards**: Pintará las cards en base a los Lotes. (Ej: `LOTE-A01`, Tipo: `Sativa`, Stock: `320g`).
- **Descuento de Stock**: Cuando se llama a `processSale()`, no solo expide el ticket a n8n, sino que envía un `UPDATE` restando los gramos vendidos al array central del Lote.
- **Validación**: Impedir agregar al carrito más gramos de los disponibles en el `.stock`.

## 3. Descuento por Fertirriego (Fase 10.2)
- El formulario modal ("Registro Diario / Fertirriego") existente en `cultivo.html` deberá modificarse.
- Se le añadirá un `<select>` para elegir el Fertilizante usado y un `input` numérico para la cantidad de `mL`.
- Al asentar la bitácora, el sistema deducirá ese mililitraje del inventario registrado en `insumos.html`.

## Backend Placeholder (Fuente de la Verdad)
Para mantener la naturaleza offline-first demostrativa de este CRM antes de la migración final a Postgres (Fase 12):
- Usaremos un objeto en `localStorage` (`core_inventory`) que actúe como base de datos local predeterminada.
- Este objeto mantendrá los arrays de `insumos` y `lotes_vendibles` y será mutado por todas las vistas (`cultivo.js`, `pos.js`, `insumos.js`).
- El Webhook de ventas/cosechas de n8n siempre recibirá el estado final actualizado para sus backups.

## Plan de Verificación:
1. Ir a `insumos.html`, crear un "Lote Externo XYZ" con 100g.
2. Ir a `pos.html`, verificar que "Lote Externo XYZ" aparezca en la grilla y vender 20g.
3. Volver a `insumos.html` y confirmar que el remanente dice "80g disponibles".
