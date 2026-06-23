# Propuestas de Mejora: Módulo de Lotes y Salas de Cultivo 🌿📊

He analizado la pantalla actual de **Salas de Cultivo** (`cultivo.html`). Actualmente contamos con un MVP (Producto Mínimo Viable) muy limpio que permite crear un lote (ID, Cepa, Fecha, Fase Fenológica) y ver los lotes activos. 

Para escalar el sistema a un nivel **"Enterprise" (Control Absoluto del Cultivo)**, aquí te presento 6 ejes de mejora ordenados por prioridad de la industria cannabis. Puedes elegir cuáles te gustaría implementar a continuación:

---

### 1. Trazabilidad y Ubicación Exacta (Tracking)
> [!IMPORTANT]
> El pilar de cualquier cultivo comercial es saber exactamente dónde está cada planta y de dónde viene.

*   **Identificación de Plantas Madre / Origen:** Añadir campos para rastrear si el lote proviene de Semilla o Clon, nombrando la Planta Madre o el código del Breeder.
*   **Asignación de Locación Dinámica:** Ahora mismo el lote es "general". Deberíamos asignarlo a una `Sala Específica` (Ej. Sala de Floración 2) e incluso a una `Mesa / Rack`, permitiendo mover lotes enteros entre zonas.
*   **Conteo y Descarte (Culling):** Registrar cuántas plantas vivas tiene el lote y crear un pequeño modal para "Dar de baja plantas" documentando el motivo (Macho, Hermafroditismo, Plaga, Enclenque).

### 2. Control Nutricional y Hídrico Diario (Fertirriego)
> [!NOTE]
> Fundamental para llevar métricas de rendimiento y detectar bloqueos de nutrientes antes de que sea tarde.

*   **Registro de Riego / Runoff:** Añadir capacidad para cargar valores diarios de la solución nutriente de entrada y, muy importante, del agua de drenaje (Runoff).
*   **Campos a medir de forma diaria:** `pH In / Out`, `EC In / Out` (Electroconductividad) y `Volumen de riego`.
*   Un gráfico o tabla histórica por Lote para ver tendencias (Ej. "El pH del sustrato está bajando abruptamente esta semana en el Lote B").

### 3. Bitácora de Operaciones Físicas (Manejo de Dosel)
> [!TIP]
> Dejar rastro de qué intervenciones físicas sufrió la planta para poder replicar el éxito en el próximo ciclo.

*   **Diario de Tareas del Lote:** Un checklist histórico dentro de la tarjeta de cada lote para marcar y fechar operaciones específicas como:
    *   *Topping (Poda Apical / FIM)*
    *   *Defoliación de bajos (Lollipopping)*
    *   *Instalación de red (Trellising)*
    *   *Cambio fotoperiódico a 12/12*

### 4. Manejo Integrado de Plagas (IPM)
> [!WARNING]
> Prevenir brotes documentando las aplicaciones.
*   **Registro de Pulverizaciones Fito-sanitarias:** Poder registrar cuándo se aplicó un fungicida/acaricida, qué producto y a qué dosis.
*   **Reporte de Avistamiento:** Un registro donde los operarios marquen si detectaron vectores (Trips, Araña Roja, Mosquita del sustrato).

### 5. Proyecciones y Rendimiento en Cosecha
*   **Calculadora de Harvest Estrellado:** Según los días de floración típicos de la cepa cargada, el sistema debería pre-calcular la fecha estimada de cosecha.
*   **Métricas de Cierre de Lote:** Al finalizar un lote, cargar `Peso Húmedo (Wet)` y `Peso Seco Final (Dry)` para calcular los gramos por vatio (g/W) o gramos por metro cuadrado, y evaluar la rentabilidad del ciclo. 

### 6. Diario Visual (Grow Diary)
*   Posibilidad de que al actualizar los datos en el front-end de un Lote, se pueda acceder a un panel expansible (Accordion) donde dejar "Notas libres de la semana" de cómo luce el cultivo.

---

## 🔗 Integración Automatizada con Calendario (Flujo N8N)
> [!IMPORTANT]
> **Respuesta a tu inquietud sobre duplicación de datos:** La clave técnica de este desarrollo será usar el mismo Webhook de N8N que creamos para el Gestor de Tareas, pero disparándolo "por debajo de la mesa" (en background) desde la pantalla de Cultivo. ¡Cargas la data una vez en el módulo de la planta, y el CRM pinta el calendario automáticamente!

¿Qué cosas se pueden (y se deben) vincular directamente al Google Calendar de forma automática desde `cultivo.html`?

1. **Fotoperíodo y Cosecha (Time-Travel Events):**
   *   Cuando creas un Lote nuevo en el CRM y le pones "Cepa: Gelato (Floración 65 días)". El sistema le enviará a N8N *tres* eventos automáticos para tu agenda:
       *   Día 0: "Cultivo Lote-A01 Iniciado".
       *   Día de Cambio de Luz (si aplica): "Cambiar fotoperíodo a 12/12 Lote-A01".
       *   Día +65: "Cosecha Estimada Lote-A01 ✂️".

2. **Manejo Integrado de Plagas (IPM Preventivo):**
   *   Al registrar en el CRM que hoy aplicaste un preventivo (Ej. Riego con Mamboretá Foliar), el sistema tendrá un checkbox: `[x] Agendar recordatorio de refuerzo en 15 días`. N8N creará la tarea en Google Calendar automáticamente para dentro de dos semanas sin que toques el Gestor de Tareas.

3. **Bitácora de Operaciones Físicas (Pruning/Podas):**
   *   Si en la pantalla de Cultivo registras "Hoy: Poda Apical", el sistema documenta el evento en la planta para trazabilidad, pero simultáneamente inyecta una nota en el Calendario: "Revisar recuperación Poda Apical - Lote-A01" para las próximas 48 horas.

**Conclusión:** El Gestor de Tareas (`tareas.html`) quedará para agendar cosas manuales y ver el panorama general de la semana, pero la gran mayoría de las tareas de cultivo nacerán orgánicamente desde los botones de la pantalla de `cultivo.html` usando el poder invisible de N8N.

---

## Próximos Pasos

Dime con total libertad:
**A)** ¿Comenzamos programando el **Motor de Eventos Automáticos** al "Registrar Nuevo Lote" para que agende las fechas estimadas de Fotoperíodo/Cosecha en tu calendario?
**B)** ¿O empezamos construyendo el **Módulo de Plagas/IPM** con recordatorios automáticos?
