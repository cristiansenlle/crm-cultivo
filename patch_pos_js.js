const fs = require('fs');
let code = fs.readFileSync('pos.js', 'utf8');

// 1. Enforce Client Name
const blockToReplace1 = `async function processSale() {
    if (cart.length === 0) return alert("El carrito está vacío.");

    const clientId = document.getElementById('clientSelect').value;

    try {`;

const newBlock1 = `async function processSale() {
    if (cart.length === 0) return alert("El carrito está vacío.");

    const clientNameInput = document.getElementById('customClientName').value.trim();
    if (!clientNameInput) {
        return alert("Error: Es obligatorio ingresar el nombre del comprador para procesar la venta.");
    }

    const clientId = document.getElementById('clientSelect').value;

    try {`;
code = code.replace(blockToReplace1, newBlock1);

// 2. Inject `customer_name` into `.insert()`
const blockToReplace2 = `                    cost_of_goods: cartItem.cost * cartItem.qty,
                    client: clientId
                }]);`;

const newBlock2 = `                    cost_of_goods: cartItem.cost * cartItem.qty,
                    client: clientId,
                    customer_name: clientNameInput
                }]);`;
code = code.replace(blockToReplace2, newBlock2);

// 3. Setup Chart variables and render logic at the bottom of the file
const renderLogic = `

// -----------------------------------------
// POS ANALYTICS MODULE (CHART.JS)
// -----------------------------------------
let posRevChart = null;
let posVolChart = null;

async function renderPOSAnalytics() {
    if (!window.salesHistoryCache || window.salesHistoryCache.length === 0) return;

    const timeFilter = document.getElementById('posTimeFilter').value;
    const clientFilter = document.getElementById('posClientFilter').value;

    // Filter out OPEX and only keep actual sales
    let sales = window.salesHistoryCache.filter(sale => {
        const isOpex = (sale.tx_id && sale.tx_id.startsWith('OPEX')) || sale.client === 'proveedor_opex';
        return !isOpex;
    });

    // Extract unique client names
    const clientSelectObj = document.getElementById('posClientFilter');
    const existingOptions = new Set();
    Array.from(clientSelectObj.options).forEach(opt => existingOptions.add(opt.value));

    sales.forEach(s => {
        let n = s.customer_name;
        if (!n) {
            if (s.client === 'vip_1') n = 'John Doe (VIP)';
            else if (s.client === 'wholesale_1') n = 'Dispensario X (Mayorista)';
            else n = 'General';
        }
        if (n && !existingOptions.has(n)) {
            const opt = document.createElement('option');
            opt.value = n;
            opt.innerText = n;
            clientSelectObj.appendChild(opt);
            existingOptions.add(n);
        }
    });

    // Apply Filters
    const now = new Date();
    sales = sales.filter(s => {
        const saleDate = new Date(s.date);
        
        let matchTime = true;
        if (timeFilter !== 'all') {
            const days = parseInt(timeFilter);
            const diffTime = Math.abs(now - saleDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > days) matchTime = false;
        }

        let matchClient = true;
        if (clientFilter !== 'all') {
            let n = s.customer_name;
            if (!n) {
                if (s.client === 'vip_1') n = 'John Doe (VIP)';
                else if (s.client === 'wholesale_1') n = 'Dispensario X (Mayorista)';
                else n = 'General';
            }
            if (n !== clientFilter) matchClient = false;
        }

        return matchTime && matchClient;
    });

    // Group by Date
    const grouped = {};
    sales.forEach(s => {
        const d = new Date(s.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        if (!grouped[d]) grouped[d] = { revenue: 0, volume: 0 };
        grouped[d].revenue += parseFloat(s.revenue || 0);
        grouped[d].volume += parseFloat(s.qty_sold || 0);
    });

    const labels = Object.keys(grouped).sort((a,b) => {
        const [da, ma] = a.split('/');
        const [db, mb] = b.split('/');
        return new Date(2026, ma-1, da) - new Date(2026, mb-1, db);
    });

    const dataRev = labels.map(l => grouped[l].revenue);
    const dataVol = labels.map(l => grouped[l].volume);

    updatePOSCharts(labels, dataRev, dataVol);
}

function updatePOSCharts(labels, dataRev, dataVol) {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#ffffff';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.1)';

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
        }
    };

    if (posRevChart) posRevChart.destroy();
    if (posVolChart) posVolChart.destroy();

    const ctxRev = document.getElementById('posRevenueChart');
    if (ctxRev) {
        posRevChart = new Chart(ctxRev, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos ($)',
                    data: dataRev,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: commonOptions
        });
    }

    const ctxVol = document.getElementById('posVolumeChart');
    if (ctxVol) {
        posVolChart = new Chart(ctxVol, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Volumen (g)',
                    data: dataVol,
                    backgroundColor: '#3498db',
                    borderRadius: 4
                }]
            },
            options: commonOptions
        });
    }
}

// Ensure the render is naturally hooked onto the data load hook
const originalLoadSalesFunction = loadSalesHistory.toString();
`;

// Try injecting at the bottom of pos.js
if (!code.includes('renderPOSAnalytics')) {
    code += renderLogic;
    
    // Inject hook at end of loadSalesHistory
    const targetHookStr = `            renderSalesHistory(data);
        }

    } catch (error) {`;
    
    const replacementHookStr = `            window.salesHistoryCache = data; // Cache for analytics chart
            renderSalesHistory(data);
            setTimeout(() => { if(typeof renderPOSAnalytics === 'function') renderPOSAnalytics(); }, 200);
        }

    } catch (error) {`;
    
    code = code.replace(targetHookStr, replacementHookStr);
    
    // Inject hook at end of renderSalesHistory for cache just in case
    const renderTableHook = `        salesHistoryBody.innerHTML = html;
    }`;
    const newRenderTableHook = `        salesHistoryBody.innerHTML = html;
    }`; // Not necessary if handled above
}

fs.writeFileSync('pos.js', code);
console.log('pos.js successfully patched with Analytics module');
