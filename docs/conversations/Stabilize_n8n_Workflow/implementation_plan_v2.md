# Plan de Acción: Estabilización y Optimización de Agentes (Groq & OpenRouter)

Tras analizar el historial de ejecuciones, se han detectado fallos recurrentes de "Rate Limit" y "Bad Request" en el agente de Groq. El bot actualmente no tiene un sistema de respaldo automático, lo que causa silencios o errores directos hacia el usuario.

## Errores Detectados
1. **Rate Limit (Groq)**: Saturación de peticiones en el modelo Llama 70B.
2. **Bad Request (Groq)**: Probablemente causado por una definición de herramientas demasiado compleja o extensa para el contexto actual.
3. **Falta de Redundancia**: Si Groq falla, el flujo se detiene en lugar de intentar con OpenRouter.

## Soluciones Propuestas

### n8n: Lógica de Respaldo (Fallback)
- **Implementar Conexión de Error**: Conectar la salida de error del nodo `AI Agent (Groq)` directamente a la entrada del nodo `AI Agent (OpenRouter)`.
- Esto garantizará que si Groq falla por cualquier motivo, el usuario reciba una respuesta procesada por OpenRouter.

### Optimización de Herramientas (Tools)
- **Simplificar Descripciones**: Eliminar avisos negativos repetitivos (ej: "NUNCA uses UUID") de cada herramienta y centralizarlos en el System Prompt.
- **Reducir Parámetros**: Asegurar que las herramientas solo pidan lo estrictamente necesario.

### Configuración de Modelos
- **Cambio de Prioridad**: Considerar usar OpenRouter como agente principal para tareas complejas y Groq para detección de intenciones o respuestas rápidas.
- **Modelo Estable**: Si `gpt-oss-120b` es inestable, cambiar a `openai/gpt-4o-mini` o `anthropic/claude-3-haiku` en OpenRouter para asegurar calidad.

## Plan de Verificación

### Pruebas de Estrés
- Forzar un fallo en Groq y verificar que OpenRouter responda correctamente en menos de 5 segundos.

### Análisis de Logs
- Monitorear el campo `execution_status` para asegurar que el 100% de las charlas terminen en un mensaje de éxito.
