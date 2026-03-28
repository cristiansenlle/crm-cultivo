document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in, redirect to index if so
    if (window.sbClient) {
        window.sbClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                window.location.href = 'index.html';
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnSubmit = document.getElementById('btn-submit');
    const errorBox = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) return;

        // Reset state
        errorBox.style.display = 'none';
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Autenticando...`;

        try {
            if (!window.sbClient) {
                throw new Error("El cliente de Supabase no está inicializado.");
            }

            const { data, error } = await window.sbClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }

            // Login exitoso, limpiar form y redirigir
            loginForm.reset();
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Login error:', error.message);
            errorText.textContent = error.message === 'Invalid login credentials'
                ? 'Correo o contraseña incorrectos.'
                : 'Error al intentar iniciar sesión. Revisa tu conexión.';
            errorBox.style.display = 'flex';

            // Revert button state
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>Ingresar</span><i class="ph ph-arrow-right"></i>`;
        }
    });
});
