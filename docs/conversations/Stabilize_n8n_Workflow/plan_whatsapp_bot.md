# Arquitectura de Integración: Chatbot de WhatsApp vía n8n

Para lograr que puedas registrar datos desde tu celular estando en la sala de cultivo sin abrir la aplicación, la mejor ruta es construir un Chatbot de WhatsApp utilizando **n8n**. Dado que ya tienes n8n corriendo como motor backend del CRM, extenderlo para WhatsApp es algo natural e increíblemente eficiente.

Aquí tienes la orientación de cómo se estructura esta solución:

## 1. El Canal de Comunicación (WhatsApp Local / Gratis)
Existen varias formas de conectar WhatsApp. Dado que tu entorno de n8n corre en local (localhost) y buscamos evitar costos recurrentes en la nube o validaciones comerciales engorrosas de Meta API, la mejor forma es utilizar una **librería basada en WhatsApp Web (Escaneo de QR)**.

Las dos mejores opciones gratuitas y locales son:
1.  **Evolution API (Recomendada):** Es una API potente basada en Node.js que se instala localmente (vía Docker o NodeScript). Funciona abriendo una instancia headless de WhatsApp Web. Escaneas el QR desde tu celular secundario, y te brinda webhooks locales (ej. `http://localhost:8080/webhook`) que conectas directamente a tu n8n local (`http://localhost:5678`). **Es 100% gratuita y funciona offline/LAN**.
2.  **whatsapp-web.js (Librería Pura):** Si prefieres algo más ligero, podemos crear un pequeño script Node.js (`bot.js`) junto a tu aplicación CRM. Este script escanea tu código QR y cuando recibe un mensaje, le dispara un request POST HTTP al Webhook de tu n8n. **Costo: $0.**

> [!TIP]
> **Recomendación Estratégica:** Vamos a implementar un pequeño script en Node (`bot.js`) usando `whatsapp-web.js`. Es la opción de más baja fricción: la alojamos dentro de tu misma carpeta `C:\Users\Cristian\.gemini\antigravity\crm cannabis`, interactúa con tu número existente gratis, y puentea los textos directamente hacia n8n, donde la magia (la fase 2) resolverá el resto.

---

## 2. El Flujo en n8n (El "Cerebro" del Bot)
El flujo en n8n constará de 3 capas principales:

### A. Webhook Inbound (Recepción)
Un nodo disparador (`Webhook`) que escucha todos los mensajes que envías a ese número de WhatsApp.

### B. NLP o Router Basado en Reglas (Procesamiento)
Cuando envías un mensaje (Ej: *"Temp 26 Hum 50 Sala 1"*, o *"Aplique mamboreta al Lote A01"*), n8n debe entenderlo. Tienes dos opciones:
1.  **Menú Interactivo (Más Fácil):**
    *   El bot te responde: *"Hola. ¿Qué quieres registrar? 1. Telemetría 2. Riego 3. Plagas"*
    *   Tú respondes "1".
    *   El bot: *"Ingresa Temperatura y Humedad separadas por espacio (Ej: 25.5 60)"*.
    *   n8n usa un Switch Node simple según tu respuesta.
2.  **Inteligencia Artificial (Avanzado pero muy rápido):**
    *   Envías un mensaje con lenguaje natural: *"Regué las flores de la sala 2 con 2 litros y ec 2.0"*
    *   n8n usa un nodo de **OpenAI (ChatGPT) o Gemini** para "leer" el mensaje y extraer un JSON estructurado de forma inteligente: `{"accion": "riego", "sala": "sala-flo-2", "volumen": 2, "ec": 2.0}`.

### C. Acción (Impacto en la App)
Una vez que n8n entiende el comando, ejecuta la acción equivalente a usar la interfaz:
*   Si enviaste Telemetría, invoca el mismo proceso interno que hoy guarda la telemetría, actualizando la métrica en vivo.
*   Si aplicaste IPM a un lote, actualiza la base de datos de ese lote y dispara el nodo de Google Calendar para la revisión a los 15 días, ¡todo sin tocar el dashboard web!

---

## 3. Ejemplo Práctico (Paso a Paso en la Sala)

1.  **Tú (en WhatsApp):** "Temp 26.5 Hum 55 en Sala Veg 1"
2.  **WhatsApp API:** Envía ese texto al Webhook de n8n.
3.  **n8n (AI Node o Regex):** Entiende que `roomId = sala-veg-1`, `temp = 26.5`, `hum = 55`.
4.  **n8n (Database / Set Node):** Guarda esos datos.
5.  **n8n (WhatsApp Node):** Te responde en WhatsApp: *"✅ Guardado: Sala Veg 1 a 26.5°C y 55%."*
6.  *(Paralelamente)*: La pantalla del dashboard instalada en tu oficina, que está haciendo *polling* cada N segundos (Fase 6 que ya hicimos), se actualiza sola y muestra la alerta de VPD si hay riesgo.

## Resumen del Plan de Implementación Local
Si decidimos avanzar, el pipeline 100% gratuito será así:
1.  **Crearemos un script Node (`bot-wa.js`)** local en tu máquina que use `whatsapp-web.js`. Te mostrará un código QR en la consola, lo escaneas con la app de WhatsApp de tu celular y tu número estará conectado a tu computadora.
2.  **Editaremos n8n** para crear un Webhook que reciba los mensajes desde `bot-wa.js`.
3.  Estableceremos una lógica de menú en n8n *(Ej: Si manda "1", entonces registrar Telemetría...)* para no depender de APIs pagas de IA (a menos que quieras enchufar el tier gratuito de Gemini).
4.  Crearemos un pequeño archivo JSON o base de datos local para que la App Web Dashboard y n8n lean la misma información.
