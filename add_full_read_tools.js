const fs = require('fs');
const file = 'C:/Users/Cristian/.gemini/antigravity/crm cannabis/n8n-crm-cannabis-workflow.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

const SUPABASE_URL = 'https://dvvfdsaqvcyftaaronhd.supabase.co/rest/v1';
const SUPABASE_KEY = 'HIDDEN_SECRET_BY_AI';

const stdHeaders = [
    { name: 'apikey', value: SUPABASE_KEY, valueProvider: 'fieldValue' },
    { name: 'Authorization', value: `Bearer ${SUPABASE_KEY}`, valueProvider: 'fieldValue' }
];

function addGetTool(id, name, description, endpoint, yPos) {
    if (wf.nodes.find(n => n.id === id)) {
        console.log(`Skipped (already exists): ${name}`);
        return;
    }
    wf.nodes.push({
        parameters: {
            name,
            description,
            method: 'GET',
            url: `${SUPABASE_URL}/${endpoint}`,
            sendHeaders: true,
            options: {},
            parametersHeaders: { values: stdHeaders }
        },
        id,
        name,
        type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
        typeVersion: 1.1,
        position: [1050, yPos]
    });
    wf.connections[id] = { main: [[], [{ node: 'AI Agent (Function Calling)', type: 'ai_tool', index: 0 }]] };
    console.log(`Added GET tool: ${name}`);
}

// ============ ADD ALL READ TOOLS ============
addGetTool(
    'tool-read-lotes-001',
    'consultar_lotes',
    'Lista todos los lotes de cultivo activos con su cepa, etapa y ubicación. Usá este tool SIEMPRE que el usuario pregunte por lotes existentes, o antes de ejecutar una acción en un lote específico para confirmar que el ID es válido.',
    'core_batches?select=id,strain,stage,location&order=id.asc',
    800
);

addGetTool(
    'tool-read-insumos-001',
    'consultar_insumos',
    'Lista el inventario de insumos de bodega (fertilizantes, pesticidas, sustratos) con su stock actual, stock mínimo y tipo. Usá este tool cuando el usuario pregunta por stock de insumos.',
    'core_inventory_quimicos?select=id,name,type,qty,min_stock,last_updated&order=name.asc',
    950
);

addGetTool(
    'tool-read-cosechas-001',
    'consultar_stock_cosechas',
    'Lista el inventario de flores secas disponibles para venta. Muestra nombre, gramos disponibles y precio. Usá este tool cuando el usuario quiera saber qué tiene para vender o qué stock de flores queda.',
    'core_inventory_cosechas?select=id,name,qty,price,type&order=name.asc',
    1100
);

addGetTool(
    'tool-read-eventos-001',
    'consultar_eventos_agronomicos',
    'Consulta los últimos eventos agronómicos registrados (plagas, podas, aplicaciones). Útil cuando el usuario pregunta por historial de un lote o qué pasó recientemente en el cultivo.',
    'core_agronomic_events?select=batch_id,room_id,event_type,description,date_occurred&order=date_occurred.desc&limit=20',
    1250
);

addGetTool(
    'tool-read-telemetry-001',
    'consultar_telemetria',
    'Consulta las últimas lecturas de temperatura, humedad y VPD por sala. Usá este tool cuando el usuario pide la telemetría actual o histórica.',
    'daily_telemetry?select=batch_id,room_id,temperature_c,humidity_percent,vpd_kpa,created_at&order=created_at.desc&limit=10',
    1400
);

addGetTool(
    'tool-read-ventas-001',
    'consultar_ventas',
    'Consulta las últimas ventas con ítem, cantidad, ingreso y cliente. Usá este tool para responder preguntas sobre historial de ventas o totales.',
    'core_sales?select=tx_id,item_id,qty_sold,revenue,client,date&order=date.desc&limit=20',
    1550
);

// ======================================================
// UPDATE SYSTEM PROMPT — conversational + intuitive
// ======================================================
const agent = wf.nodes.find(n => n.name === 'AI Agent (Function Calling)');
if (agent) {
    agent.parameters.options = agent.parameters.options || {};
    agent.parameters.options.systemMessage =
        `Sos el Agente de CRM Cannabis 360 OS. Tu trabajo es registrar datos, ejecutar acciones y responder consultas sobre el cultivo, ventas e inventario usando las herramientas (Tools) disponibles. Respondé siempre en español de Argentina. Sé conciso, claro y profesional.

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 MODO CONSULTA
━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el usuario pida ver datos o historial, SIEMPRE ejecutá el tool de consulta y devolvé los datos formateados en lenguaje natural (nunca JSON crudo):
• "¿Qué lotes tengo?" → consultar_lotes → listá: "Tus lotes activos son: LOTE-A01 (Sour Diesel, vegetativo, sala-veg-1), ..."
• "¿Cuánto insumo tengo?" → consultar_insumos → listá nombre, tipo, stock y si está bajo mínimo
• "¿Qué tengo para vender?" → consultar_stock_cosechas → listá gramos y precio
• "¿Qué pasó con el lote X?" → consultar_eventos_agronomicos
• "¿Cuál es la temperatura?" → consultar_telemetria
• "¿Cuánto vendí?" → consultar_ventas

━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ MODO CARGA — Diálogo Paso a Paso
━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el usuario quiere REGISTRAR algo, seguí siempre este flujo:

1. Identificá qué tool usar según la intención.
2. Verificá qué datos requeridos ya te dio y cuáles faltan.
3. Preguntá los datos faltantes UNO POR UNO, en orden lógico, de forma natural.
4. Antes de ejecutar, confirmá: "Voy a registrar: [resumen]. ¿Confirmás con un 'sí'?"
5. Ejecutá el tool y devolvé confirmación positiva o, si hay error, listá los códigos válidos (usando el tool de consulta correspondiente).

DATOS REQUERIDOS POR TOOL:
• reportar_evento_agronomico → Lote (batch_id), Sala (sala-X-N), Tipo (Plaga/Poda/Aplicacion), Descripción
• cargar_telemetria_sala → Temperatura (°C), Humedad (%), Sala o Lote
• avanzar_fase → Lote (batch_id), Nueva Fase (vegetativo/floracion/cosecha)
• registrar_cosecha_humeda → Lote (batch_id), Gramos húmedos
• registrar_cosecha_seca → Lote (batch_id), Gramos secos
• ingresar_insumo_bodega → Nombre del insumo, Tipo (fertilizante/pesticida/sustrato), Cantidad, Costo unitario
• cargar_ventas_pos → Lote/Item (item_id), Gramos vendidos (qty), Precio total ($), Cliente (walk_in/vip_1/wholesale_1)

DIÁLOGO EJEMPLO — "Trips en lote 1":
Vos: "Voy a registrar un evento de Plagas/Trips para el lote. ¿En qué sala está ese lote? (ej: sala-veg-1, sala-flo-1)"
Usuario: "veg 1"
Vos: "Entendido, sala-veg-1. ¿Agregás alguna descripción? (ej: 'máculas en hojas superiores') o decí 'ninguna' para omitir."
Usuario: "Se vieron en hojas superiores"
Vos: "Perfecto. Voy a registrar: Plaga Trips en LOTE-A01, sala-veg-1, descripción: 'Se vieron en hojas superiores'. ¿Confirmás?"
Usuario: "Sí" → Ejecutás el tool.

━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGLAS DE FORMATO
━━━━━━━━━━━━━━━━━━━━━━━━
• Lotes: LOTE-X00 ("lote 1" → "LOTE-A01", "lote b2" → "LOTE-B02")
• Salas: con guiones ("veg 1" → "sala-veg-1", "floracion" → "sala-flo-1", "madres" → "sala-madres")
• Si un tool devuelve error o vacío: ejecutá el consultar correspondiente y presentá las opciones reales al usuario.
• Nunca inventés un batch_id o sala. Siempre confirmá con los datos reales de la base de datos.
`;
    console.log('Updated: System prompt with full conversational intelligence.');
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2));
console.log('Done. Full upgrade saved to workflow.');
