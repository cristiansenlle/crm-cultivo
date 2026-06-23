# Plan: Mejoras AI Agent (Intuición) y Herramienta de Ventas

## Objetivo
1. Hacer que el AI Agent de n8n sea más intuitivo, detallando al usuario qué parámetro falló o falta solicitar en caso de un error en los Tools, y mejorando su normalización de IDs (ej. LOTE-A01 en vez de lote 1).
2. Agregar un nuevo Tool (`cargar_ventas_pos`) que cumpla con el mismo workaround estructural (`parametersBody.values`) introducido recientemente.

## Cambios a implementar (via script NodeJS en n8n-crm-cannabis-workflow.json)

### 1. Actualización de System Prompt (Intuición y Error Handling)
Se modificará el mensaje de sistema del nodo `agent-001` para inyectar reglas duras sobre formato de IDs y manejo de errores:
- *Instrucción de formateo:* "Transforma nombres coloquiales de lotes al formato de base de datos (ej. 'lote 1' -> 'LOTE-A01', 'lote b2' -> 'LOTE-B02'). Transforma nombres coloquiales de salas al formato con guiones (ej. 'sala veg 1' -> 'sala-veg-1', 'sala floracion' -> 'sala-flo-1')."
- *Instrucción de Fallback:* "Si una herramienta devuelve un error, NO respondas con mensajes genéricos como 'hubo un error'. Analiza qué parámetro pudo haber fallado y pregunta intuitivamente al usuario por el dato exacto (ej. 'Parece que el ID del lote LOTE-1 no es válido, ¿me confirmas el código exacto?')."

### 2. Nuevo Tool (cargar_ventas_pos)
Se agregará un nodo de tipo `@n8n/n8n-nodes-langchain.toolHttpRequest`.
- **Datos enviados (Body):** `{ "item_id": "{lote_id}", "qty": "{cantidad}", "price": "{precio}", "client": "{cliente}" }` (usando `{lote_id}` con los placeholderDefinitions bypasseados en la description).
- **Destino:** Se enviará a un nuevo webhook interno de n8n llamado `/webhook/agent-sale`.

### 3. Nodos de Soporte para la Venta
Se agregarán nodos en n8n para escuchar `/webhook/agent-sale`:
- **Webhook Node:** Escucha el POST.
- **Postgres Node (Venta):** `INSERT INTO core_sales (tx_id, item_id, qty_sold, revenue, client) VALUES (...)`
- **Postgres Node (Stock Update):** `UPDATE core_inventory_cosechas SET qty = qty - {cantidad} WHERE id = {lote_id}`

## Verificación Planificada
1. Validar que la sintaxis generada cumpla estrictamente con `parametersBody.values` y no reviente el front-end de n8n mediante un test JS (`test_tool_schema.js`).
2. Comprobar que el JSON de n8n modificado es válido y parseable (`json_parse`).
3. Notificar al usuario (vía `notify_user`) para que pruebe el "error intencional" con los lotes erróneos que mandaba para comprobar si la IA ahora es más intuitiva pidiendo datos en vez de dar el error genérico.
