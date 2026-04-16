const fs = require('fs');
let html = fs.readFileSync('pos.html', 'utf8');

// 1. Mandatory Input
html = html.replace('placeholder="Nombre del cliente casual (Opcional)"', 'placeholder="Nombre completo del comprador (Obligatorio)"');

// Remove toggle script
const scriptToKill = `                    <script>
                        function toggleCustomClientInput(val) {
                            const container = document.getElementById('customClientContainer');
                            if (val === 'walk_in') {
                                container.style.display = 'block';
                            } else {
                                container.style.display = 'none';
                                document.getElementById('customClientName').value = '';
                            }
                        }
                    </script>`;
html = html.replace(scriptToKill, '');
html = html.replace('onchange="toggleCustomClientInput(this.value)"', '');

// 2. Insert Dash
const injectLocation = '            <!-- Sales History: Bot + Web -->';
const dashBlock = `            <!-- Módulo de Análisis de Ventas -->
            <div style="padding: 0 3rem 1.5rem;">
                <div class="widget span-4">
                    <div class="widget-header">
                        <h3><i class="ph ph-chart-bar"></i> Análisis de Ventas</h3>
                        <div style="display:flex; gap:10px;">
                            <select id="posTimeFilter" class="input-base" style="padding:5px 10px; background:var(--bg-dark); color:white; border:1px solid var(--border-color); border-radius:4px; font-size:0.85rem;" onchange="renderPOSAnalytics()">
                                <option value="all">Todo el Histórico</option>
                                <option value="7" selected>Últimos 7 días</option>
                                <option value="30">Últimos 30 días</option>
                            </select>
                            <select id="posClientFilter" class="input-base" style="padding:5px 10px; background:var(--bg-dark); color:white; border:1px solid var(--border-color); border-radius:4px; font-size:0.85rem;" onchange="renderPOSAnalytics()">
                                <option value="all">Todos los Clientes</option>
                                <!-- JS inyectará opciones únicas de clientes acá -->
                            </select>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:15px;">
                        <div style="background:var(--bg-dark); padding:15px; border-radius:8px; border:1px solid var(--border-color);">
                            <h4 style="margin-bottom:10px; font-size:0.85rem; color:var(--text-secondary);">Ingresos de Caja Acumulados ($)</h4>
                            <div style="height:250px; position:relative;"><canvas id="posRevenueChart"></canvas></div>
                        </div>
                        <div style="background:var(--bg-dark); padding:15px; border-radius:8px; border:1px solid var(--border-color);">
                            <h4 style="margin-bottom:10px; font-size:0.85rem; color:var(--text-secondary);">Volumen Dispensado (Gramos)</h4>
                            <div style="height:250px; position:relative;"><canvas id="posVolumeChart"></canvas></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sales History: Bot + Web -->`;

html = html.replace(injectLocation, dashBlock);
fs.writeFileSync('pos.html', html);
console.log('pos.html successfully reconstructed');
