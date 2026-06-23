# Implementación Fase 9: Asistente Operativo IA (Intent Recognition Avanzado)

## Objetivo
Dotar al agente de Gemini (n8n) de capacidades de ejecución (Agentic AI) para que deje de ser solo un chatbot consultivo y se convierta en un asistente capaz de interactuar con sistemas de terceros (Google Calendar, Base de Datos PostgreSQL) basándose en las intenciones del usuario decodificadas desde lenguaje natural.

## 1. Re-ingeniería del Prompt Maestro de Gemini
Actualmente, el nodo de Gemini tiene un System Instruction básico que fuerza la salida unívoca a `{"intent": "chat", "reply": "..."}`.
Se modificará para que devuelva un JSON estructurado según el análisis de intenciones (NLP):

### Intents Soportados:
1. `chat`: Conversación normal, dudas o consultas agronómicas. (Mantiene el flujo actual).
2. `calendar_task`: Cuando el usuario pide agendar o recordar algo (podas, riegos, revisiones de IPM).
   - Variables requeridas a extraer por la IA: `date` (Fecha y hora calculada en ISO 8601 por la IA), `title` (Título corto), `description` (Detalle o lote de la tarea).
3. `harvest_dry`: Cuando el usuario notifica o registra los gramos secos de una cosecha para mandar a stock.
   - Variables requeridas a extraer por la IA: `batch_id` (Identificador del lote deducido, ej. LOTE-A01), `weight` (Peso en gramos puro número).

## 2. Ruteo en n8n (Nodo Switch "Intent Router")
Se agregará un nodo **Switch** ("Router de Intenciones Gemini") inmediatamente después del nodo "Parse Gemini Response".
Las reglas de ruteo serán evaluadas contra el string `{{ $json.intent }}` devuelto por la IA:
- **Output 0 (`chat`)**: Ruta inalterada hacia el envío directo de la respuesta de texto por WhatsApp.
- **Output 1 (`calendar_task`)**: Ruta que desemboca en Google Calendar para crear el evento y luego notifica su éxito formateando el `$json.reply` original por WhatsApp.
- **Output 2 (`harvest_dry`)**: Ruta que desemboca en PostgreSQL para actualizar el inventario y luego notifica el éxito por WhatsApp.

## 3. Nodos de Ejecución (Acción)
- **Google Calendar Node**: Se reutilizarán las credenciales OAuth2 existentes en el workflow para ejecutar la acción "Create Event" hidratando los campos con `$json.title`, `$json.description`, y `$json.date`.
- **Postgres Node** (Opcional/Simulador si no hay tabla): Nodo SQL o Set Node para asentar la lógica empresarial del stock.

## Plan de Verificación
- **Prueba 1 (Chat)**: Mandar *"Hola, cómo va?"* -> Debe devolver intent `chat` y responder naturalmente.
- **Prueba 2 (Operaciones)**: Mandar *"Recordame regar el Lote B mañana a la tarde"* -> La IA debe generar una fecha 2026-XX-XXT15:00:00, intent `calendar_task` y agendarlo en Google.
- **Prueba 3 (Inventario)**: Mandar *"Anotá que el Lote A01 nos rindió 320 gramos en total"* -> La IA debe atrapar weight: `320`, batch: `LOTE-A01`, intent `harvest_dry` e inyectarlo en DB.
