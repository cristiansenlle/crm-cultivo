const fs = require('fs');

let code = fs.readFileSync('main.js', 'utf8');

const target1 = `// Configs for Charts
const commonChartOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
        x: { grid: { display: false }, ticks: { color: '#AAA' } },
        y: { grid: { color: '#333' }, ticks: { color: '#AAA' } }
    },
    plugins: { legend: { display: false } },
    elements: { point: { radius: 3 } }
};`;

const repl1 = `// Colors dynamically resolved against CSS variables
function getChartColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        textColor: isLight ? '#4B5563' : '#8F97B3', // text-secondary
        gridColor: isLight ? '#E5E7EB' : '#333333',
        pointBg: isLight ? '#FFFFFF' : '#121212'
    };
}

function getCommonChartOptions() {
    const colors = getChartColors();
    return {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { grid: { display: false }, ticks: { color: colors.textColor } },
            y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor } }
        },
        plugins: { legend: { display: false } },
        elements: { point: { radius: 3 } }
    };
}

window.updateChartsTheme = function() {
    if (!tempChartInstance || !humChartInstance || !vpdChartInstance) return;
    const colors = getChartColors();
    const instances = [tempChartInstance, humChartInstance, vpdChartInstance];
    instances.forEach(chart => {
        chart.options.scales.x.ticks.color = colors.textColor;
        chart.options.scales.y.ticks.color = colors.textColor;
        chart.options.scales.y.grid.color = colors.gridColor;
        chart.data.datasets.forEach(ds => ds.pointBackgroundColor = colors.pointBg);
        chart.update();
    });
};`;

const target2 = `    // Temp Chart
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChartInstance = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'Temp (°C)', data: [...data.tempHistory],
                borderColor: '#FF3D00', backgroundColor: createGradient(ctxTemp, 'rgba(255, 61, 0, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#121212', pointBorderColor: '#FF3D00'
            }]
        },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, suggestedMin: 18, suggestedMax: 32 } } }
    });

    // Hum Chart
    const ctxHum = document.getElementById('humChart').getContext('2d');
    humChartInstance = new Chart(ctxHum, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'Hum (%)', data: [...data.humHistory],
                borderColor: '#2979FF', backgroundColor: createGradient(ctxHum, 'rgba(41, 121, 255, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#121212', pointBorderColor: '#2979FF'
            }]
        },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, suggestedMin: 30, suggestedMax: 80 } } }
    });

    // VPD Chart
    const ctxVpd = document.getElementById('vpdChart').getContext('2d');
    vpdChartInstance = new Chart(ctxVpd, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'VPD (kPa)', data: [...data.vpdHistory],
                borderColor: '#00E676', backgroundColor: createGradient(ctxVpd, 'rgba(0, 230, 118, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#121212', pointBorderColor: '#00E676'
            }]
        },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, suggestedMin: 0.5, suggestedMax: 1.8 } } }
    });`;

const repl2 = `    const opts = getCommonChartOptions();
    const colors = getChartColors();

    // Temp Chart
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChartInstance = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'Temp (°C)', data: [...data.tempHistory],
                borderColor: '#FF3D00', backgroundColor: createGradient(ctxTemp, 'rgba(255, 61, 0, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: colors.pointBg, pointBorderColor: '#FF3D00'
            }]
        },
        options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 18, suggestedMax: 32 } } }
    });

    // Hum Chart
    const ctxHum = document.getElementById('humChart').getContext('2d');
    humChartInstance = new Chart(ctxHum, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'Hum (%)', data: [...data.humHistory],
                borderColor: '#2979FF', backgroundColor: createGradient(ctxHum, 'rgba(41, 121, 255, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: colors.pointBg, pointBorderColor: '#2979FF'
            }]
        },
        options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 30, suggestedMax: 80 } } }
    });

    // VPD Chart
    const ctxVpd = document.getElementById('vpdChart').getContext('2d');
    vpdChartInstance = new Chart(ctxVpd, {
        type: 'line',
        data: {
            labels: [...data.labels],
            datasets: [{
                label: 'VPD (kPa)', data: [...data.vpdHistory],
                borderColor: '#00E676', backgroundColor: createGradient(ctxVpd, 'rgba(0, 230, 118, 0.5)'),
                borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: colors.pointBg, pointBorderColor: '#00E676'
            }]
        },
        options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 0.5, suggestedMax: 1.8 } } }
    });`;


// Basic strip CR replacing for solid matches
code = code.replace(/\r\n/g, '\n');

if (code.includes(target1)) code = code.replace(target1, repl1);
if (code.includes(target2)) code = code.replace(target2, repl2);

fs.writeFileSync('main.js', code);
console.log('Script finish');
