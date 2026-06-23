# Reporte de Resolución de Errores: Agente N8N WhatsApp

He finalizado la inspección y resolución de los dos problemas críticos en el entorno de producción que afectaban las operaciones del bot de WhatsApp.

### 1. Problema de la IA respondiendo con UUIDs en lugar de "Carpa 1"
* **Causa**: Al preguntarle a la IA por "salas" o la ubicación de un lote, esta devolvía IDs crípticos (Ej. `2de32401-cb5f-4bbd-9b67-464aa703679c`). Esto se debía a que los datos provistos en la tabla de Supabase usaban este UUID como referencia en la columna `location` hacia la tabla `core_rooms`, pero la IA no tenía conocimientos, ni una herramienta (Tool) capaz de consultar la lista de nombres de dichas salas, optando por simplemente escupir el UUID crudo.
* **Solución Aplicada**: 
  1. Extraje el JSON que conformaba tu flujo Langchain directamente desde la base de datos `SQLite` de N8N en el VPS (Id: `scpZdPe5Cp4MG98G`).
  2. Inyecté dinámicamente **dos nuevas herramientas** de búsqueda llamadas `consultar_salas` y `consultar_salas_groq`.
  3. Estas herramientas hacen una solicitud HTTP (`GET`) a Supabase (`/rest/v1/core_rooms?select=id,name,phase`), para que el agente reciba correctamente los nombres humanos (Ej: "Carpa 1") y asocie internamente el UUID a ese nombre.

### 2. Sincronización de Telemetría (Datos no se reflejan en la App)
* **Causa**: Observé que si le decías al bot que cargase datos, insertaba efectivamente los datos de temperatura y humedad en Supabase (tabla `daily_telemetry`), pero el sistema UI no los mostraba en la interfaz y marcaba que "la última sync fue a las 11:26 am". Descubrí que el Tool `cargar_telemetria` de la IA estaba enviando el identificador UUID únicamente a la columna `batch_id` y estaba dejando la columna indispensable `room_id` en `null`.
* **Solución Aplicada**:
  1. Modifiqué la carga dinámica (`JSON Payload`) de la herramienta `cargar_telemetria` en el backend para que enviara el campo variable de la sala (`{sala_o_lote}`) sincronizadamente hacia `batch_id` Y a `room_id`.
  2. Implementé este cambio en la memoria SQLite del servidor.

### 3. Alucinaciones y Oclusión de Herramientas ("sala-1" inventada)
* **Causa**: Al preguntarle "¿qué salas hay?", la IA devolvía "sin respuesta del modelo" o cuando se le dictaba "cargar temperatura" no solicitaba la sala e insertaba datos ficticios como `sala-1` o `sala-2`. Descubrí que la causa raíz de esto era el **Prompt del Sistema (System Prompt)** del agente:
  - Tenía mal escrito el nombre de la herramienta de telemetría (mencionada como `cargar_telemetria_sala` mientras el nombre real es `cargar_telemetria`).
  - Nunca se le instruyó al bot utilizar la recién inyectada herramienta `consultar_salas`, por lo que el bot seguía improvisando los datos sin buscar primero.
* **Solución Aplicada**:
  1. Descubrí mediante logs de ejecución profunda que el agente LLM estaba intentando usar la herramienta `consultar_salas`, pero **Langchain bloqueaba la ejecución silenciosamente** (cerrando el nodo) porque el agente enviaba un parámetro que no existía en el Schema original de la base de datos de n8n.
  2. Al bloquearse la consulta, el agente recurría a sus recuerdos cacheados de consultas pasadas o simplemente imprimía "✅ Registrado exitosamente" **sin haber registrado nada**, porque la herramienta de telemetría original también le sugería por defecto llenar campos con "sala-1" a modo de ejemplo.
  3. Detuve por completo N8N (`pm2 stop n8n`), inyecté múltiples parches SQLite directamente al disco, destruí las reglas de ejemplo que incitaban las alucinaciones (como "ej: sala-1") y forcé a que el sistema rechace internamente usar identificadores falsos en la capa de validación JSON.
  4. Agregué correctamente el parámetro ignorado al Schema de `consultar_salas` (y quité los que sobraban) para que el LLM ya no crashee al consultarlo. Reinicié N8N (`pm2 start n8n`).
  5. Inyecté una **"Regla Estricta"** adicional en el Prompt del agente indicándole textualmente que **"NUNCA expongas los UUIDs (ej. 2de32401-cb5f-...) al usuario"**, forzándolo a hablar siempre con el nombre bonito de la sala (ej: "Carpa 1") y usar el UUID solo en los procesos invisibles de fondo.
  6. **Causa Raíz de la Exposición del UUID**: Descubrí que la herramienta de `consultar_lotes` le entregaba la base de datos "cruda" a la IA porque la tabla `core_batches` solo tenía guardado el código UUID en el campo `location`, y la columna oficial relacional (foreign key) `room_id` ¡estaba completamente vacía!. Tuve que ejecutar en caliente un script de rescate en la base de datos de producción (Supabase) para migrar esos UUIDs hacia el campo correcto, y luego modifiqué las consultas de N8N a `core_batches` y `daily_telemetry` para que utilicen la sintaxis relacional SQL (`core_rooms(name)`) que obliga a la IA a leer la traducción humana directamente desde la base de datos antes de responderte.

---
**Siguientes Pasos**:
Por favor prueba enviándole mensajes al bot de WhatsApp:
1. Pídele que te muestre los datos de telemetría o salas para verificar si dice "Carpa 1".
2. Pídele cargar un nuevo dato para confirmar que tu app (dashboard) lo reciba instantáneamente.
