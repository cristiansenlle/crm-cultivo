// CANNABIS-CORE 360 - POS Logic

let cart = [];
let availableStock = []; // Cargado dinámicamente desde core_inventory_cosechas

const tiers = {
    'walk_in': 0,    // 0%
    'vip_1': 0.10, // 10%
    'wholesale_1': 0.30  // 30%
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadInventory();
    await loadSalesHistory();
});

// ─── Inventory ────────────────────────────────────────────────────────────────
async function loadInventory() {
    try {
        if (!window.sbClient) return;
        const { data, error } = await window.sbClient
            .from('core_inventory_cosechas')
            .select('*')
            .gt('qty', 0);
        if (error) throw error;
        availableStock = data || [];
        renderPOSItems();
    } catch (e) {
        console.error('Error fetching POS Inventory:', e);
        availableStock = [];
        renderPOSItems();
    }
}

function renderPOSItems() {
    const grid = document.getElementById('posInventoryGrid');
    if (!grid) return;

    if (availableStock.length === 0) {
        grid.innerHTML = '<p style="padding:2rem; color:var(--text-secondary); text-align:center;">Sin lotes disponibles en Bodega.<br>Ingresá una cosecha en la sección Bodega e Insumos.</p>';
        return;
    }

    let html = '';
    availableStock.forEach(item => {
        const costPerG = item.qty > 0 && item.price > 0 ? item.price / item.qty : 0;
        html += `
        <div class="product-card" onclick="addToCart('${item.id}', '${item.name}', ${costPerG.toFixed(2)})">
            <div class="strain-tag type-hybrid">${item.type === 'cosecha_local' ? 'PROPIA' : 'B2B'}</div>
            <h4>${item.name}</h4>
            <p class="product-type">ID: ${item.id}</p>
            <div class="product-footer">
                <span class="stock">${item.qty}g Disp.</span>
                <span class="price" style="color:var(--color-green);">+ Agregar</span>
            </div>
        </div>`;
    });
    grid.innerHTML = html;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
function addToCart(id, name, costPrice) {
    const lot = availableStock.find(i => i.id === id);
    if (!lot) return;

    let qtyStr = prompt(`¿Cuántos gramos de "${name}"?\nDisponibles: ${lot.qty}g`, '10');
    if (!qtyStr) return;
    let qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0 || qty > lot.qty)
        return alert('Cantidad inválida o excede el stock disponible (' + lot.qty + 'g).');

    let pricePerGStr = prompt(`¿Precio por gramo de "${name}"? ($)`, '8000');
    if (!pricePerGStr) return;
    let pricePerG = parseFloat(pricePerGStr);
    if (isNaN(pricePerG) || pricePerG < 0) return alert('Precio inválido.');

    const total = qty * pricePerG;

    const existing = cart.find(i => i.id === id);
    if (existing) {
        if (existing.qty + qty > lot.qty) return alert('Stock global excedido.');
        existing.qty += qty;
        existing.price += total;
        // Weighted average price per gram
        existing.pricePerG = existing.price / existing.qty;
    } else {
        cart.push({ id, name, pricePerG, price: total, cost: costPrice, qty });
    }
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    renderCart();
}

function renderCart() {
    const cartList = document.getElementById('cartList');
    if (cart.length === 0) {
        cartList.innerHTML = '<div class="empty-cart-msg">El carrito está vacío</div>';
    } else {
        let html = '';
        cart.forEach(item => {
            html += `
            <div class="cart-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <span>${item.qty}g × $${item.pricePerG.toLocaleString('es-AR')}/g</span>
                </div>
                <div class="item-actions">
                    <span class="sub" style="color:var(--color-green); font-weight:700;">$${item.price.toLocaleString('es-AR')}</span>
                    <button class="btn-icon" onclick="removeFromCart('${item.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>`;
        });
        cartList.innerHTML = html;
    }
    updateTotals();
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const clientId = document.getElementById('clientSelect').value;
    const discountFactor = tiers[clientId] || 0;
    const discountAmt = subtotal * discountFactor;
    const total = subtotal - discountAmt;

    document.getElementById('posSubtotal').innerText = `$${subtotal.toLocaleString('es-AR')}`;
    document.getElementById('posDiscount').innerText = `-$${discountAmt.toLocaleString('es-AR')}`;
    document.getElementById('posTotal').innerText = `$${total.toLocaleString('es-AR')}`;
}

document.getElementById('clientSelect').addEventListener('change', updateTotals);

// ─── Process Sale ─────────────────────────────────────────────────────────────
async function processSale() {
    if (cart.length === 0) return alert('El carrito está vacío');

    const btn = document.getElementById('btnCompletarVenta');
    const ogText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Facturando...';
    btn.disabled = true;

    try {
        const clientId = document.getElementById('clientSelect').value;
        const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
        const discountFactor = tiers[clientId] || 0;
        const total = subtotal * (1 - discountFactor);

        if (window.sbClient) {
            for (const cartItem of cart) {
                // 1. Descontar inventario
                const lot = availableStock.find(c => c.id === cartItem.id);
                if (lot) {
                    const newQty = lot.qty - cartItem.qty;
                    await window.sbClient.from('core_inventory_cosechas')
                        .update({ qty: newQty })
                        .eq('id', cartItem.id);
                }

                // 2. Registrar en core_sales (date, item_id, qty_sold, revenue, cost_of_goods, client)
                await window.sbClient.from('core_sales').insert([{
                    tx_id: 'TX-WEB-' + Date.now(),
                    date: new Date().toISOString(),
                    item_id: cartItem.id,
                    qty_sold: cartItem.qty,
                    revenue: cartItem.price,           // total = qty × price/g
                    cost_of_goods: cartItem.cost * cartItem.qty,
                    client: clientId
                }]);
            }
        }

        cart = [];
        renderCart();
        await loadInventory();
        await loadSalesHistory();
        document.getElementById('successOverlay').style.display = 'flex';

    } catch (error) {
        console.error('Error procesando venta:', error);
        alert('Error al registrar la venta: ' + (error.message || JSON.stringify(error)));
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

function closeSuccess() {
    document.getElementById('successOverlay').style.display = 'none';
}

// ─── Sales History (Bot + Web) ────────────────────────────────────────────────
async function loadSalesHistory() {
    const container = document.getElementById('salesHistoryBody');
    if (!container || !window.sbClient) return;

    try {
        const { data, error } = await window.sbClient
            .from('core_sales')
            .select('*')
            .order('date', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-secondary);">Sin ventas registradas aún.</td></tr>';
            return;
        }

        const clientLabels = { walk_in: 'Casual', vip_1: 'VIP', wholesale_1: 'Mayorista' };

        container.innerHTML = data.map(s => {
            const fecha = new Date(s.date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: '2-digit' });
            const hora = new Date(s.date).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });
            const source = s.tx_id?.startsWith('TX-WEB') ? '<span style="color:var(--color-blue);font-size:0.75rem;">🖥 Web</span>' : '<span style="color:var(--color-green);font-size:0.75rem;">📱 Bot</span>';
            let clientLabel = clientLabels[s.client] || s.client;

            if (s.client === 'walk_in' && s.customer_name && s.customer_name !== 'Consumidor Final') {
                clientLabel = `Casual (${s.customer_name})`;
            }

            const pricePerG = s.qty_sold > 0 ? (s.revenue / s.qty_sold).toFixed(0) : '-';
            return `<tr>
                <td style="padding:0.6rem 0; font-size:0.85rem; color:var(--text-secondary);">${fecha} ${hora}</td>
                <td>${source}</td>
                <td style="font-size:0.8rem; color:var(--text-secondary);">${s.item_id}</td>
                <td style="font-family:monospace;">${s.qty_sold}g</td>
                <td style="font-family:monospace; color:var(--text-secondary);">$${Number(pricePerG).toLocaleString('es-AR')}/g</td>
                <td>${clientLabel}</td>
                <td style="font-weight:700; color:var(--color-green);">$${parseFloat(s.revenue).toLocaleString('es-AR')}</td>
            </tr>`;
        }).join('');

    } catch (e) {
        console.error('Error cargando historial de ventas:', e);
        container.innerHTML = '<tr><td colspan="6" style="color:var(--color-red); padding:1rem;">Error cargando ventas.</td></tr>';
    }
}

// Auto-refresh sales history every 30s to pick up bot sales
setInterval(loadSalesHistory, 30000);
