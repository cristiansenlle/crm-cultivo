const fs = require('fs');
const path = require('path');

const htmlFiles = [
    'index.html', 'cultivo.html', 'tareas.html',
    'insumos.html', 'pos.html', 'analytics.html', 'agronomy.html'
];

// The theme.js script tag to inject before </head>
const THEME_SCRIPT = `    <!-- Theme Toggle -->\n    <script src="theme.js"></script>`;

// The toggle button to inject before </div> of system-status div
const TOGGLE_BTN = `            <button id="themeToggleBtn" class="theme-toggle">
                <i class="ph ph-sun"></i> Modo Claro
            </button>`;

let changed = 0;

htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log('MISSING:', file);
        return;
    }

    let html = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Add theme.js before </head> if not already there
    if (!html.includes('theme.js')) {
        html = html.replace('</head>', THEME_SCRIPT + '\n</head>');
        modified = true;
        console.log(`[${file}] Added theme.js script`);
    }

    // 2. Add toggle button inside .system-status div (before its closing tag)
    if (!html.includes('themeToggleBtn')) {
        // Find the system-status div and add button after its closing </div>
        html = html.replace(
            /<\/div>\s*<\/aside>/,
            `            ${TOGGLE_BTN}\n        </div>\n        </aside>`
        );
        modified = true;
        console.log(`[${file}] Added theme toggle button`);
    }

    if (modified) {
        fs.writeFileSync(filePath, html);
        changed++;
    }
});

console.log(`\nDone. Modified ${changed}/${htmlFiles.length} files.`);
