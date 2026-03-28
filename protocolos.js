// protocolos.js
document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (!window.sbClient) {
        console.error("Supabase client not initialized.");
        return;
    }
    
    // Check session
    window.sbClient.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        // Setup user profile
        const userEmail = session.user.email;
        const profileImg = document.querySelector('.user-profile img');
        if (profileImg) {
            profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=333&color=fff`;
            profileImg.title = userEmail;
        }

        // Initialize Module
        loadProtocols();
    });
});

let currentProtocols = [];
let editingProtocolId = null;

async function loadProtocols() {
    const container = document.getElementById('protocols-container');
    container.innerHTML = '<div style="color: var(--text-secondary); padding: 2rem;"><i class="ph ph-spinner ph-spin"></i> Cargando protocolos...</div>';

    const { data, error } = await window.sbClient
        .from('core_protocols')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando protocolos:", error);
        container.innerHTML = `<div style="color: var(--color-red); padding: 2rem;">Error: ${error.message}. ¿Se ha creado la tabla core_protocols?</div>`;
        return;
    }

    currentProtocols = data || [];
    renderProtocols();
}

function renderProtocols() {
    const container = document.getElementById('protocols-container');
    
    if (currentProtocols.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; border: 1px dashed var(--border-color); border-radius: 12px; color: var(--text-secondary);">
                <i class="ph ph-book-open" style="font-size: 3rem; margin-bottom: 1rem; color: #555;"></i>
                <h3 style="color: white; margin-bottom: 0.5rem;">Aún no hay protocolos</h3>
                <p>Crea tu primer procedimiento estándar o receta de cultivo utilizando el botón de arriba.</p>
            </div>`;
        return;
    }

    container.innerHTML = '';
    
    currentProtocols.forEach(p => {
        const card = document.createElement('div');
        card.className = 'protocol-card';
        card.onclick = () => openViewProtocolModal(p.id);

        card.innerHTML = `
            <div class="protocol-meta">
                <span class="badge badge-stage"><i class="ph ph-leaf"></i> ${p.stage}</span>
                <span class="badge badge-topic"><i class="ph ph-hash"></i> ${p.topic}</span>
            </div>
            <h3 class="protocol-title">${p.title}</h3>
            <p class="protocol-preview">${escapeHtml(p.content)}</p>
            <div style="margin-top: auto; font-size: 0.75rem; color: #666; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.8rem;">
                <span><i class="ph ph-clock"></i> ${new Date(p.created_at).toLocaleDateString()}</span>
                <span style="color: var(--color-green); font-weight: 600;">Ver Completo &rarr;</span>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Modal Functions
function openCreateProtocolModal() {
    editingProtocolId = null;
    document.getElementById('protocolModalTitle').innerText = 'Nuevo Protocolo';
    document.getElementById('protocolForm').reset();
    document.getElementById('protocolId').value = '';
    document.getElementById('saveProtocolBtn').innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar Protocolo';
    document.getElementById('protocolModal').style.display = 'flex';
}

function openEditCurrentProtocol() {
    if (!editingProtocolId) return;
    
    const p = currentProtocols.find(x => x.id === editingProtocolId);
    if (!p) return;
    
    closeViewProtocolModal(); // Close view
    
    document.getElementById('protocolModalTitle').innerText = 'Editar Protocolo';
    document.getElementById('protocolId').value = p.id;
    document.getElementById('protocolTitle').value = p.title;
    document.getElementById('protocolStage').value = p.stage;
    document.getElementById('protocolTopic').value = p.topic;
    document.getElementById('protocolContent').value = p.content;
    document.getElementById('saveProtocolBtn').innerHTML = '<i class="ph ph-pencil-simple"></i> Actualizar Protocolo';
    
    document.getElementById('protocolModal').style.display = 'flex';
}

function closeProtocolModal() {
    document.getElementById('protocolModal').style.display = 'none';
}

// View Protocol Modal
function openViewProtocolModal(id) {
    const p = currentProtocols.find(x => x.id === id);
    if (!p) return;
    
    editingProtocolId = p.id;
    
    document.getElementById('viewProtocolTitle').innerText = p.title;
    document.getElementById('viewProtocolMeta').innerHTML = `
        <span class="badge badge-stage"><i class="ph ph-leaf"></i> ${p.stage}</span>
        <span class="badge badge-topic"><i class="ph ph-hash"></i> ${p.topic}</span>
        <span style="font-size: 0.8rem; color: #888; margin-left: 10px;"><i class="ph ph-calendar"></i> ${new Date(p.created_at).toLocaleDateString()}</span>
    `;
    
    // Basic markdown/newline preservation
    const contentHtml = escapeHtml(p.content).replace(/\n/g, '<br>');
    document.getElementById('viewProtocolContent').innerHTML = contentHtml;
    
    document.getElementById('viewProtocolModal').style.display = 'flex';
}

function closeViewProtocolModal() {
    document.getElementById('viewProtocolModal').style.display = 'none';
    editingProtocolId = null;
}

// Save & Delete
async function saveProtocol(e) {
    e.preventDefault();
    
    const btn = document.getElementById('saveProtocolBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Guardando...';
    btn.disabled = true;

    const id = document.getElementById('protocolId').value;
    const payload = {
        title: document.getElementById('protocolTitle').value,
        stage: document.getElementById('protocolStage').value,
        topic: document.getElementById('protocolTopic').value,
        content: document.getElementById('protocolContent').value
    };

    try {
        let error;
        if (id) {
            // Update
            const res = await window.sbClient.from('core_protocols').update(payload).eq('id', id);
            error = res.error;
        } else {
            // Insert
            const res = await window.sbClient.from('core_protocols').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        closeProtocolModal();
        await loadProtocols(); // Reload grid
        
        // Show success
        alert(id ? "Protocolo actualizado correctamente" : "Protocolo creado correctamente");
    } catch (err) {
        console.error("Error saving protocol:", err);
        alert("Error al guardar: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteCurrentProtocol() {
    if (!editingProtocolId) return;
    
    if (!confirm('¿Estás seguro de que deseas eliminar este protocolo? Esta acción no se puede deshacer.')) return;
    
    try {
        const { error } = await window.sbClient.from('core_protocols').delete().eq('id', editingProtocolId);
        if (error) throw error;
        
        closeViewProtocolModal();
        await loadProtocols();
    } catch (err) {
        console.error("Error deleting protocol:", err);
        alert("Error al eliminar: " + err.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}
