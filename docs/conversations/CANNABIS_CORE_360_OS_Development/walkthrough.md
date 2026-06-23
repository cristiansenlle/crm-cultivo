# CANNABIS-CORE 360 - Dashboard UI/UX Walkthrough

El desarrollo del Dashboard Inteligente para **CANNABIS-CORE 360 OS** ha concluido con éxito.

## Cambios Realizados

Se construyó una interfaz web moderna, minimalista y en *Dark Mode* que centraliza la visualización de los datos de cultivo y la gestión comercial. 

### Estructura de Archivos (Vanilla JS / CSS / HTML)
Los archivos se crearon en el directorio principal y no requieren un entorno de Node activo para previsualizarse, aunque en producción se servirán a través del backend que definimos en el plan.

*   [`index.html`](file:///c:/Users/Cristian/.gemini/antigravity/crm%20cannabis/index.html) - Contiene la estructura de layout: Barra lateral, Cabecera, y los Módulos de "Live Grow Room", "Task Manager", "Sales & Inventory".
*   [`style.css`](file:///c:/Users/Cristian/.gemini/antigravity/crm%20cannabis/style.css) - Define las variables CSS, los widgets con "Glow" reactivo a estados (Verde, Amarillo, Rojo), y los modales de emergencia.
*   [`main.js`](file:///c:/Users/Cristian/.gemini/antigravity/crm%20cannabis/main.js) - Script de control primario. 

### Módulos Implementados

1.  **Live Grow Room (Telemetría Viva):** Tarjetas superiores que muestran `Temp`, `Hum`, `CO2` y `VPD`. Incluyen un gradiente reactivo mediante clases CSS (`.glow-green`, `.glow-red`).
2.  **Gráfico de Curva VPD:** Implementado con `Chart.js` para simular la actualización en vivo (cada 5 min) desde webhooks de n8n.
3.  **Task Manager:** Panel inferior de tareas urgentes simuladas e integración natural de alertas de mantenimiento o fertilización.
4.  **Sales & Financial Health:** Panel dinámico que mide el stock remanente y los ingresos pendientes con un botón simulador de disparo de webhook hacia n8n (`Trigger Sale Flow`).

## Pruebas de Validación

### Verificación Manual

Para visualizar la interfaz y simular la lógica:

1.  Abre el archivo `index.html` directamente en tu navegador web.
2.  Revisa la gráfica de **VPD Curve (Live n8n Sync)** que actualiza en tiempo real de manera mockeada.
3.  **Simular Alerta Crítica (IoT Error):** Presiona el botón `Simulate Alert` en el encabezado del gráfico. Observarás que:
    *   La temperatura brinca por encima del rango ideal.
    *   Los componentes cambian agresivamente a color rojo (Glow-Red).
    *   Aparecerá el `Overlay` de estado de emergencia bloqueando la interfaz.
4.  **Simular Integración Comercial:** Presiona el botón de `Trigger Sale Flow (n8n)` y valida que el feedback visual informe del correcto inicio del flujo con webhook a n8n.

Hacer doble click en este archivo para abrir el dashboard en el navegador: [index.html](file:///c:/Users/Cristian/.gemini/antigravity/crm%20cannabis/index.html)
