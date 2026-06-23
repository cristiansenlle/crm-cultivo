# Implementación Fase 15: Agente de Inteligencia Artificial (Function Calling)

## Objetivo
Implementar un Agente IA Avanzado vía WhatsApp (texto y voz) utilizando n8n y OpenAI Function Calling. Este agente será capaz de comprender lenguaje natural, identificar la intención del usuario y ejecutar operaciones de escritura/lectura directamente sobre la base de datos Supabase, mapeando el 100% de las funcionalidades del dashboard web.

## 1. Arquitectura del Agente IA en n8n
En lugar de depender de sentencias condicionales (Switch nodes) largas y frágiles, migraremos el flujo a la arquitectura **Advanced AI de n8n**:
*   **Trigger**: Webhook receptor de WhatsApp.
*   **Audio Parser (Gratuito)**: Nodo HTTP Request apuntando a la **API de Groq (modelo Whisper-large-v3)**. Groq procesa audios a velocidad ultra-rápida y tiene un tier 100% gratuito extremadamente generoso ideal para este proyecto.
*   **AI Agent Node**: El cerebro de la operación, impulsado por OpenAI (GPT-4o-mini).
*   **Memoria**: *Window Buffer Memory* conectada a una base local (Redis/Supabase) para recordar el contexto de la charla.
*   **Tools (Herramientas)**: Nodos adheridos al Agente que la IA puede "invocar" autónomamente si necesita realizar una acción. Usaremos nodos Postgres pre-configurados.

### 2. Desarrollo de Tools (Herramientas)
- [x] Crear herramienta `crear_nuevo_lote` y `avanzar_fase_lote` para el ciclo de clon/semilla.
- [x] Crear herramienta `registrar_cosecha_humeda` y `registrar_cosecha_seca` para inyectar stock.
- [x] Crear herramienta `reportar_evento_agronomico` (Plagas/Podas).
- [x] Crear herramienta `cargar_telemetria_sala` (Termohigrómetro manual).
- [x] Crear herramienta `ingresar_insumo_bodega` (Control y alta de stock).
- [x] Parchear la sintaxis de variables dinámicas de n8n ToolHttpRequest debido al bug de Regex de Langchain (*key cannot be empty*).
- [x] Aplicar inyección de `{variables}` en los strings de `description` para hacer bypass al estricto y bugueado validador de nodos de n8n (*Misconfigured placeholder*).
- [x] Bypass de la validación de variables indefinidas de n8n para los parámetros de las Tools.

## 2. Definición de Herramientas (OpenAI Tools / Functions)
El Agente será equipado con las siguientes herramientas. Cuando el usuario pida algo, el LLM mapeará el lenguaje natural a los parámetros de la herramienta y ejecutará la acción en BD:

### A. Gestión de Lotes y Fases
*   **`crear_nuevo_lote`**: 
    *   *Descripción AI*: Crea un nuevo lote de cultivo en una sala determinada.
    *   *Parámetros*: `identificador` (string), `cepa` (string), `estado_inicial` (enum: germinacion, vegetativo, floracion), `sala` (enum: sala-veg-1, sala-flo-1, sala-flo-2), `origen` (clon/semilla).
*   **`avanzar_fase_lote`**: 
    *   *Descripción AI*: Mueve un lote específico a la siguiente fase fenológica.
    *   *Parámetros*: `batch_id` (string, ej: LOTE-001), `nueva_fase` (enum: vegetativo, floracion, cosecha).

### B. Cosechas y Rendimiento
*   **`registrar_cosecha_humeda`**:
    *   *Descripción AI*: Registra los gramos húmedos recién cortados de un lote.
    *   *Parámetros*: `batch_id` (string), `peso_gramos` (number).
*   **`registrar_cosecha_seca`**:
    *   *Descripción AI*: Ingresa los gramos secos curados finales, finalizando el lote en cultivo y moviendo el stock al inventario de Punto de Venta (POS).
    *   *Parámetros*: `batch_id` (string), `cepa` (string), `peso_gramos_secos` (number).

### C. Línea de Tiempo Agronómica (Timeline)
*   **`reportar_evento_agronomico`**:
    *   *Descripción AI*: Reporta la aparición de plagas, realización de podas o aplicación de foliares.
    *   *Parámetros*: `batch_id` (string), `sala` (string), `tipo_evento` (enum: Plaga, Aplicacion, Poda, Fase, Info), `descripcion` (string).
*   **`cargar_telemetria_sala`**:
    *   *Descripción AI*: Ingresa métricas de clima para una sala específica.
    *   *Parámetros*: `sala` (string), `temperatura_c` (number opcional), `humedad_porcentaje` (number opcional), `vpd` (number opcional).

### D. Tareas y Agenda
*   **`agendar_tarea_calendar`**:
    *   *Descripción AI*: Crea un recordatorio accionable en Google Calendar (ej. "recordame regar mañana").
    *   *Parámetros*: `titulo` (string), `descripcion` (string), `fecha_iso` (string).

### E. Bodega e Insumos
*   **`ingresar_insumo_bodega`**:
    *   *Descripción AI*: Registra la compra o ingreso de un nuevo insumo químico, fertilizante o sustrato a la bodega.
    *   *Parámetros*: `nombre_insumo` (string), `tipo` (enum: fertilizante, pesticida, sustrato), `cantidad_ingresada` (number), `costo_total` (number).

## 3. Plan de Verificación (User Acceptance Testing)
Para dar la fase por completada, se realizarán las siguientes pruebas desde la consola de emulación del webhook (o WhatsApp):

1.  *(Voz/Texto)*: **"Pasá el lote LOTE-A01 a floración"** -> El agente debe invocar `avanzar_fase_lote` (batch_id='LOTE-A01', fase='floracion').
2.  *(Voz/Texto)*: **"Anotá que el LOTE-0402 me rindió 350 gramos secos"** -> El agente debe invocar `registrar_cosecha_seca` y enviar al POS.
3.  *(Voz/Texto)*: **"Encontré algunos trips en la sala veg 1"** -> El agente invoca `reportar_evento_agronomico` (tipo='Plaga', descripcion='Trips').

## User Review Required
> [!IMPORTANT]
> **Aprobación de Arquitectura Compleja**:
> Esta implementación requerirá reemplazar tu workflow de Switch statement básico en n8n por el ecosistema de **Advanced AI / Agent Nodes**. El proveedor de voz seleccionado será Groq (gratuito). ¿Avanzamos con la configuración en n8n?
