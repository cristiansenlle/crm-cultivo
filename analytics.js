// CANNABIS-CORE 360 - Analytics & Finanzas

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.sbClient) {
        console.error("Supabase client not initialized.");
        return;
    }

    await loadFinancialData();
    await loadLotesForPdf();
});

let salesData = [];
let filteredSalesData = [];
let cosechasData = [];
let myChart = null;

async function loadFinancialData() {
    try {
        const { data: sales, error: errSales } = await window.sbClient.from('core_sales').select('*').order('date', { ascending: false });
        if (errSales) throw errSales;
        salesData = sales || [];

        applyFilters();
    } catch (e) {
        console.error("Error al cargar finanzas:", e);
    }
}

function applyFilters() {
    const timeFilter = document.getElementById('timeFilterSelect').value;
    const now = new Date();

    filteredSalesData = salesData.filter(sale => {
        if (timeFilter === 'all') return true;

        const saleDate = new Date(sale.date);
        const diffMonths = (now.getFullYear() - saleDate.getFullYear()) * 12 + (now.getMonth() - saleDate.getMonth());

        if (timeFilter === 'mes') return diffMonths <= 1;
        if (timeFilter === 'trimestre') return diffMonths <= 3;
        if (timeFilter === 'semestre') return diffMonths <= 6;
        if (timeFilter === 'ano') return diffMonths <= 12;
        return true;
    });

    renderMetrics();
    renderTable();
    renderChart();
}

async function loadLotesForPdf() {
    try {
        const { data: lotes, error: errLotes } = await window.sbClient.from('core_inventory_cosechas').select('*');
        if (errLotes) throw errLotes;
        cosechasData = lotes || [];

        const select = document.getElementById('loteSelectPdf');
        select.innerHTML = '<option value="">-- Elija un lote --</option>';
        cosechasData.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.innerText = `${l.id} - ${l.name}`;
            select.appendChild(opt);
        });

        // Add event listener to pre-fetch telemetry when selection changes
        select.addEventListener('change', prefetchTelemetryForPdf);
    } catch (e) {
        console.error("Error al cargar lotes para PDF:", e);
    }
}

let cachedTelemetryInfo = { avgTemp: "N/A", avgVpd: "N/A" };

async function prefetchTelemetryForPdf() {
    const lotId = document.getElementById('loteSelectPdf').value;
    if (!lotId) {
        cachedTelemetryInfo = { avgTemp: "N/A", avgVpd: "N/A" };
        return;
    }

    try {
        const { data: telemetry, error: telErr } = await window.sbClient
            .from('daily_telemetry')
            .select('temperature_c, vpd_kpa')
            .eq('batch_id', lotId);

        if (!telErr && telemetry && telemetry.length > 0) {
            const sumT = telemetry.reduce((acc, curr) => acc + parseFloat(curr.temperature_c || 0), 0);
            const sumV = telemetry.reduce((acc, curr) => acc + parseFloat(curr.vpd_kpa || 0), 0);
            cachedTelemetryInfo.avgTemp = (sumT / telemetry.length).toFixed(1) + " °C";
            cachedTelemetryInfo.avgVpd = (sumV / telemetry.length).toFixed(2) + " kPa";
        } else {
            cachedTelemetryInfo.avgTemp = "Sin telemetría registrada";
            cachedTelemetryInfo.avgVpd = "Sin telemetría registrada";
        }
    } catch (e) {
        console.error("No se pudo obtener la telemetría histórica", e);
        cachedTelemetryInfo.avgTemp = "Error al cargar";
        cachedTelemetryInfo.avgVpd = "Error al cargar";
    }
}

function renderMetrics() {
    let totalRevenue = 0;
    let totalCosts = 0;

    filteredSalesData.forEach(sale => {
        totalRevenue += parseFloat(sale.revenue || 0);
        totalCosts += parseFloat(sale.cost_of_goods || 0);
    });

    const netProfit = totalRevenue - totalCosts;

    document.getElementById('totalRevenue').innerText = `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('totalCosts').innerText = `$${totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const profitEl = document.getElementById('netProfit');
    profitEl.innerText = `$${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    profitEl.style.color = netProfit >= 0 ? "var(--color-blue)" : "var(--color-red)";
}

function renderTable() {
    const tbody = document.getElementById('salesTableBody');
    if (filteredSalesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:15px; text-align:center;">No hay transacciones registradas en este período.</td></tr>';
        return;
    }

    const txSearch = document.getElementById('txSearchInput')?.value.toLowerCase() || '';
    const custSearch = document.getElementById('customerSearchInput')?.value.toLowerCase() || '';

    // Render Transaction History Table
    const visibleTxs = filteredSalesData.filter(sale => {
        const text = `${sale.tx_id} ${sale.client} ${sale.customer_name} ${sale.item_id}`.toLowerCase();
        return text.includes(txSearch);
    });

    if (visibleTxs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:15px; text-align:center;">No hay resultados para la búsqueda.</td></tr>';
    } else {
        let html = '';
        visibleTxs.forEach(sale => {
            const d = new Date(sale.date);
            const dateStr = d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) + ' ' + d.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });

            let clientLabel = sale.client || 'General';
            if (sale.client === 'walk_in' && sale.customer_name && sale.customer_name !== 'Consumidor Final') {
                clientLabel = `Casual (${sale.customer_name})`;
            } else if (sale.client === 'walk_in') {
                clientLabel = 'Casual (Consumidor Final)';
            } else if (sale.client === 'vip_1') {
                clientLabel = 'VIP (John Doe)';
            } else if (sale.client === 'wholesale_1') {
                clientLabel = 'Mayorista (Dispensario X)';
            }

            const isOpex = (sale.tx_id && sale.tx_id.startsWith('OPEX')) || sale.client === 'proveedor_opex';
            const color = isOpex ? "var(--color-red)" : "var(--color-green)";
            const sign = isOpex ? "-" : "+";
            const amount = isOpex ? parseFloat(sale.cost_of_goods).toFixed(2) : parseFloat(sale.revenue).toFixed(2);
            const qtyStr = isOpex ? '-' : `${sale.qty_sold}g`;
            
            let displayTxId = sale.tx_id || 'INFO-SISTEMA';
            if (isOpex && displayTxId && displayTxId.startsWith('OPEX-')) {
                const parts = displayTxId.split('-');
                if (parts.length >= 2) displayTxId = parts[0] + '-' + parts[1];
            } else if (isOpex) {
                displayTxId = 'OPEX-MANUAL';
            }
            if (isOpex) clientLabel = 'Gasto / Proveedor';

            const clientOut = isOpex ? '<i class="ph ph-shopping-cart" style="color:var(--color-red)"></i> ' + clientLabel : clientLabel;

            html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding:10px; font-family:monospace; font-size:0.85rem">${displayTxId}</td>
                <td style="color:var(--text-muted);">${dateStr}</td>
                <td style="text-transform: capitalize;">${clientOut}</td>
                <td><strong>${sale.item_id}</strong></td>
                <td style="font-family:monospace;">${qtyStr}</td>
                <td style="color:${color}; font-weight:600;">${sign}$${amount}</td>
            </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Process Customer Stats
    const customerStats = {};
    filteredSalesData.forEach(sale => {
        let clientLabel = sale.client || 'General';
        if (sale.client === 'walk_in' && sale.customer_name && sale.customer_name !== 'Consumidor Final') {
            clientLabel = `Casual (${sale.customer_name})`;
        } else if (sale.client === 'walk_in') {
            clientLabel = 'Casual (Consumidor Final)';
        } else if (sale.client === 'vip_1') {
            clientLabel = 'VIP (John Doe)';
        } else if (sale.client === 'wholesale_1') {
            clientLabel = 'Mayorista (Dispensario X)';
        }

        const aggName = sale.customer_name && sale.customer_name !== 'Consumidor Final' ? sale.customer_name : clientLabel.replace('Casual (Consumidor Final)', 'Consumidor Final General');

        if (!customerStats[aggName]) {
            customerStats[aggName] = { txCount: 0, grams: 0, revenue: 0 };
        }
        customerStats[aggName].txCount += 1;
        customerStats[aggName].grams += parseFloat(sale.qty_sold || 0);
        customerStats[aggName].revenue += parseFloat(sale.revenue || 0);
    });

    // Render Customer Stats Table
    const cBody = document.getElementById('customerSalesTableBody');
    if (!cBody) return;

    if (Object.keys(customerStats).length === 0) {
        cBody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center;">No hay datos de clientes.</td></tr>';
        return;
    }

    // Sort by revenue descending and apply filter
    const visibleCustomers = Object.keys(customerStats).sort((a, b) => customerStats[b].revenue - customerStats[a].revenue)
        .filter(c => c.toLowerCase().includes(custSearch));

    if (visibleCustomers.length === 0) {
        cBody.innerHTML = '<tr><td colspan="4" style="padding:15px; text-align:center;">No hay resultados para la búsqueda.</td></tr>';
    } else {
        let htmlCust = '';
        visibleCustomers.forEach(cName => {
            const stat = customerStats[cName];
            htmlCust += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding:10px; font-weight:600; text-transform: capitalize;"><i class="ph ph-user" style="color:var(--text-muted)"></i> ${cName}</td>
                    <td>${stat.txCount} compras</td>
                    <td style="font-family:monospace;">${stat.grams.toFixed(1)}g</td>
                    <td style="color:var(--color-green); font-weight:bold;">$${stat.revenue.toFixed(2)}</td>
                </tr>
            `;
        });
        cBody.innerHTML = htmlCust;
    }
}

// CSV Export Utilities
function downloadCSV(filename, csvData) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportCustomerCSV() {
    const custSearch = document.getElementById('customerSearchInput')?.value.toLowerCase() || '';

    // Re-aggregate and filter
    const customerStats = {};
    filteredSalesData.forEach(sale => {
        let clientLabel = sale.client || 'General';
        if (sale.client === 'walk_in' && sale.customer_name && sale.customer_name !== 'Consumidor Final') {
            clientLabel = `Casual (${sale.customer_name})`;
        } else if (sale.client === 'walk_in') {
            clientLabel = 'Casual (Consumidor Final)';
        }

        const aggName = sale.customer_name && sale.customer_name !== 'Consumidor Final' ? sale.customer_name : clientLabel.replace('Casual (Consumidor Final)', 'Consumidor Final General');
        if (!customerStats[aggName]) customerStats[aggName] = { txCount: 0, grams: 0, revenue: 0 };
        customerStats[aggName].txCount += 1;
        customerStats[aggName].grams += parseFloat(sale.qty_sold || 0);
        customerStats[aggName].revenue += parseFloat(sale.revenue || 0);
    });

    const visibleCustomers = Object.keys(customerStats).sort((a, b) => customerStats[b].revenue - customerStats[a].revenue)
        .filter(c => c.toLowerCase().includes(custSearch));

    let csvContent = "Nombre del Cliente,Ctd. Transacciones,Volumen (g),Ingreso Generado\n";
    visibleCustomers.forEach(cName => {
        const stat = customerStats[cName];
        // Enclose name in quotes to handle commas
        csvContent += `"${cName}",${stat.txCount},${stat.grams.toFixed(2)},${stat.revenue.toFixed(2)}\n`;
    });

    downloadCSV("reporte_ventas_por_cliente.csv", csvContent);
}

function exportTxCSV() {
    const txSearch = document.getElementById('txSearchInput')?.value.toLowerCase() || '';

    const visibleTxs = filteredSalesData.filter(sale => {
        const text = `${sale.tx_id} ${sale.client} ${sale.customer_name} ${sale.item_id}`.toLowerCase();
        return text.includes(txSearch);
    });

    let csvContent = "ID Transaccion,Fecha,Cliente,Lote,Gramos,Ingreso\n";
    visibleTxs.forEach(sale => {
        const d = new Date(sale.date);
        const dateStr = d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) + ' ' + d.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });

        let clientLabel = sale.client || 'General';
        if (sale.client === 'walk_in' && sale.customer_name && sale.customer_name !== 'Consumidor Final') {
            clientLabel = `Casual (${sale.customer_name})`;
        } else if (sale.client === 'walk_in') {
            clientLabel = 'Casual (Consumidor Final)';
        }

        const isOpex = (sale.tx_id && sale.tx_id.startsWith('OPEX-')) || sale.client === 'proveedor_opex';
        const rev = isOpex ? -Math.abs(parseFloat(sale.cost_of_goods || 0)) : parseFloat(sale.revenue || 0);
        csvContent += `"${sale.tx_id}","${dateStr}","${clientLabel}","${sale.item_id}",${sale.qty_sold},${rev.toFixed(2)}\n`;
    });

    downloadCSV("historial_transacciones.csv", csvContent);
}

function renderChart() {
    if (myChart) {
        myChart.destroy();
    }

    const ctx = document.getElementById('salesChart').getContext('2d');
    const chartType = document.getElementById('chartTypeSelect').value;

    if (chartType === 'pie' || chartType === 'doughnut') {
        let sumRev = 0; let sumCost = 0;
        filteredSalesData.forEach(s => { sumRev += parseFloat(s.revenue || 0); sumCost += parseFloat(s.cost_of_goods || 0); });
        myChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: ['Ingresos Operativos', 'Costos Operativos'],
                datasets: [{
                    data: [sumRev, sumCost],
                    backgroundColor: ['rgba(74, 158, 103, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderWidth: 1,
                    borderColor: '#121212'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#ccc' } } }
            }
        });
        return;
    }

    // Agrupar ventas por día
    const dailyData = {};
    filteredSalesData.forEach(s => {
        const d = new Date(s.date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        if (!dailyData[d]) {
            dailyData[d] = { revenue: 0, costs: 0 };
        }
        dailyData[d].revenue += parseFloat(s.revenue || 0);
        dailyData[d].costs += parseFloat(s.cost_of_goods || 0);
    });

    const labels = Object.keys(dailyData).reverse(); // Orden cronológico asumiendo que descendente antes
    const revenues = labels.map(l => dailyData[l].revenue);
    const profits = labels.map(l => dailyData[l].revenue - dailyData[l].costs);

    myChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels.length > 0 ? labels : ['Sin Datos'],
            datasets: [
                {
                    label: 'Ingresos ($)',
                    data: revenues.length > 0 ? revenues : [0],
                    backgroundColor: 'rgba(74, 158, 103, 0.7)',
                    borderColor: '#4a9e67',
                    borderWidth: 1,
                    borderRadius: chartType === 'bar' ? 4 : 0,
                    tension: 0.3
                },
                {
                    label: 'Rentabilidad (ROI) ($)',
                    data: profits.length > 0 ? profits : [0],
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: chartType === 'bar' ? 4 : 0,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#888' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#888' }
                }
            },
            plugins: {
                legend: { labels: { color: '#ccc' } }
            }
        }
    });
}

// Changed from async to sync to maintain browser's transient user activation for downloading files
function generateBatchPassport() {
    const lotId = document.getElementById('loteSelectPdf').value;
    if (!lotId) return alert("Por favor seleccione un lote válido para generar el Pasaporte.");

    const lote = cosechasData.find(l => l.id === lotId);
    if (!lote) return;

    // Use pre-fetched telemetry data
    let avgTemp = cachedTelemetryInfo.avgTemp;
    let avgVpd = cachedTelemetryInfo.avgVpd;

    // Fill Template Values
    document.getElementById('pdfLoteName').innerText = lote.name;
    document.getElementById('pdfId').innerText = lote.id;
    document.getElementById('pdfDate').innerText = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) + ' ' + new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    document.getElementById('pdfStrain').innerText = lote.name.replace(lote.id, '').replace(/[()]/g, '').trim() || 'Desconocida';
    document.getElementById('pdfType').innerText = lote.type === 'cosecha_b2b' ? "Tercerizado B2B (Materia Prima Pronta)" : "Cultivo Controlado en Instalaciones Propias";
    document.getElementById('pdfQty').innerText = lote.qty;

    document.getElementById('pdfAvgTemp').innerText = avgTemp;
    document.getElementById('pdfAvgVpd').innerText = avgVpd;

    // Trigger html2pdf
    const element = document.getElementById('pdfTemplate');
    if (!element) {
        console.error("PDF template not found in DOM");
        return;
    }

    // Backup current display state, then show for capture
    const originalDisplay = element.style.display;
    element.style.display = 'block';

    const opt = {
        margin: 0.5,
        filename: `Pasaporte_CORE360_${lote.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = originalDisplay; // Restore hidden state
    }).catch(err => {
        console.error("Error generating PDF:", err);
        element.style.display = originalDisplay;
        alert("Ocurrió un error al generar el PDF. Revisa la consola para más detalles.");
    });
}
