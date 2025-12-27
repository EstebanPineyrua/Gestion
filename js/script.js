// CONFIGURACIÓN (Cambia esto con tus datos)
const GITHUB_USERNAME = "EstebanPineyrua"; 
const REPO_NAME = "Gestion";          
const FILE_PATH = "data/stock.json"; 

let stockData = [];
let shaFile = "";
let isAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
    const tokenGuardado = localStorage.getItem("adminToken");
    if (tokenGuardado) document.getElementById('github-token').value = tokenGuardado;
    cargarStockPublico();
});

// Función para cerrar sesión
function cerrarSesion() {
    if(confirm("¿Cerrar sesión? Se borrará el token del navegador.")) {
        localStorage.removeItem("adminToken");
        location.reload();
    }
}

// Carga datos evitando la caché (Para ver cambios del celu en PC)
async function cargarStockPublico() {
    const status = document.getElementById('status-msg');
    document.getElementById('loading').style.display = 'block';
    try {
        const timestamp = new Date().getTime();
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${FILE_PATH}?v=${timestamp}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error();
        stockData = await response.json();
        renderTabla();
        status.innerText = "✅ Datos sincronizados";
        status.style.color = "gray";
    } catch (e) {
        status.innerText = "⚠️ Error al conectar con la base de datos.";
    }
    document.getElementById('loading').style.display = 'none';
}

async function activarModoAdmin() {
    const token = document.getElementById('github-token').value.trim();
    if (!token) return alert("Ingresa el Token");

    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        shaFile = data.sha;
        isAdmin = true;
        localStorage.setItem("adminToken", token);
        
        document.getElementById('admin-controls').style.display = 'flex';
        document.getElementById('github-token').style.display = 'none';
        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('col-acciones').style.display = 'table-cell';
        renderTabla();
    } catch (e) { alert("Token inválido o error de permisos."); }
}

function renderTabla() {
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = "";
    stockData.forEach((item, i) => {
        const row = document.createElement('tr');
        if(isAdmin) row.classList.add('editing');

        let linkContent = isAdmin 
            ? `<input class="editable" value="${item.url || ''}" placeholder="URL" onchange="stockData[${i}].url=this.value">`
            : (item.url ? `<a href="${item.url}" target="_blank" class="ver-link">VER PRODUCTO</a>` : "-");

        row.innerHTML = `
            <td><input class="editable" value="${item.marca || ''}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].marca=this.value"></td>
            <td><input class="editable" value="${item.producto || ''}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].producto=this.value"></td>
            <td><input type="number" class="editable" value="${item.stock || 0}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].stock=Number(this.value)"></td>
            <td>${linkContent}</td>
            ${isAdmin ? `<td><button onclick="eliminarFila(${i})" class="btn-del">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(row);
    });
}

function agregarFila() {
    stockData.push({ marca: "Nueva", producto: "Producto", stock: 0, url: "" });
    renderTabla();
}

function eliminarFila(i) {
    if(confirm("¿Eliminar?")) { stockData.splice(i, 1); renderTabla(); }
}

async function guardarCambios() {
    const token = localStorage.getItem("adminToken");
    const btn = document.getElementById('btn-save');
    btn.innerText = "⏳ Guardando...";
    btn.disabled = true;

    const content = btoa(new TextEncoder().encode(JSON.stringify(stockData, null, 2)).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Cloud Update", content: content, sha: shaFile })
        });
        if (res.ok) {
            const resData = await res.json();
            shaFile = resData.content.sha;
            alert("✅ Guardado en la nube exitosamente.");
            renderTabla();
        } else { throw new Error(); }
    } catch (e) { alert("Error al guardar. Verifica tu conexión o token."); }
    btn.innerText = "💾 Guardar Cambios";
    btn.disabled = false;
}