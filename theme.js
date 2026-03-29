// CANNABIS-CORE 360 — Theme Toggle (Dark / Light)
// Applied before DOM renders to avoid flash of wrong theme

(function () {
    const saved = localStorage.getItem('core360_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

function initThemeToggle() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    const updateBtn = (theme) => {
        if (theme === 'light') {
            btn.innerHTML = '<i class="ph ph-moon"></i> Modo Oscuro';
        } else {
            btn.innerHTML = '<i class="ph ph-sun"></i> Modo Claro';
        }
    };

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateBtn(currentTheme);

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('core360_theme', next);
        updateBtn(next);
        if (typeof window.updateChartsTheme === 'function') window.updateChartsTheme();
    });
}

document.addEventListener('DOMContentLoaded', initThemeToggle);
