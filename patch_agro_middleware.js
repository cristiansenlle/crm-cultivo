const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('n8n-crm-cannabis-workflow-INVENTARIO-2026-03-22.json', 'utf8'));

function makeMiddlewareNode(original) {
    return {
        ...original,
        parameters: {
            method: 'POST',
            url: 'http://109.199.99.126:5006/bot-agronomico',
            sendHeaders: true,
            parametersHeaders: {
                values: [
                    { name: 'Content-Type', valueProvider: 'fieldValue', value: 'application/json' }
                ]
            },
            sendBody: true,
            parametersBody: {
                values: [
                    { name: 'batches', valueProvider: 'fieldValue', value: '{batches}' },
                    { name: 'inputs', valueProvider: 'fieldValue', value: '{inputs}' },
                    { name: 'water_liters', valueProvider: 'fieldValue', value: '{water_liters}' },
                    { name: 'event_type', valueProvider: 'fieldValue', value: '{event_type}' },
                    { name: 'raw_description', valueProvider: 'fieldValue', value: '{raw_description}' }
                ]
            },
            placeholderDefinitions: {
                values: [
                    {
                        name: 'batches',
                        description: 'Array JSON de IDs de lotes destino. Ej: ["Planta Madre NP/1/2025","RHC/1/2026"]. Obtener IDs exactos via consultar_batches.',
                        type: 'string'
                    },
                    {
                        name: 'inputs',
                        description: 'Array JSON de insumos aplicados con nombre y cantidad. Ej: [{"name":"Top Veg","qty":5},{"name":"Barrier","qty":1}]. Usar nombre comercial del producto.',
                        type: 'string'
                    },
                    {
                        name: 'water_liters',
                        description: 'Litros totales de agua usados para diluir. Numero decimal. Ej: 1.5',
                        type: 'number'
                    },
                    {
                        name: 'event_type',
                        description: 'Tipo de evento: Nutricion, Prevencion, Aplicacion, Plaga, Poda, Fase o Info',
                        type: 'string'
                    },
                    {
                        name: 'raw_description',
                        description: 'Descripcion completa en texto libre del evento tal como lo relato el usuario',
                        type: 'string'
                    }
                ]
            }
        }
    };
}

// Patch both agent tool nodes
wf.nodes[36] = makeMiddlewareNode(wf.nodes[36]);
wf.nodes[57] = makeMiddlewareNode(wf.nodes[57]);

const outFile = 'n8n-crm-cannabis-workflow-AGRO-MIDDLEWARE-2026-03-24.json';
fs.writeFileSync(outFile, JSON.stringify(wf, null, 2));
console.log('Saved:', outFile, 'Size:', fs.statSync(outFile).size, 'bytes');
