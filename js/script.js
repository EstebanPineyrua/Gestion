// --- CONFIGURACIÓN ---
const GITHUB_USERNAME = "EstebanPineyrua"; 
const REPO_NAME = "Gestion";          1
const FILE_PATH = "data/stock.json"; 

let stockData = [];
let shaFile = "";
let isAdmin = false;

// Cargar al inicio
document.addEventListener("DOMContentLoaded", () => {
    const tokenGuardado = localStorage.getItem("adminToken");
    if (tokenGuardado) document.getElementById('github-token').value = tokenGuardado;
    cargarStockPublico();
});

async function cargarStockPublico() {
    document.getElementById('loading').style.display = 'block';
    try {
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${FILE_PATH}?cache=${new Date().getTime()}`;
        const response = await fetch(url);
        stockData = await response.json();
        renderTabla();
    } catch (e) {
        document.getElementById('status-msg').innerText = "⚠️ Error al cargar el JSON.";
    }
    document.getElementById('loading').style.display = 'none';
}

function renderTabla() {
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = "";
    
    stockData.forEach((item, i) => {
        const row = document.createElement('tr');
        if(isAdmin) row.classList.add('editing');

        // Lógica de la columna Link
        let linkContent = "";
        if (isAdmin) {
            // El admin ve un input para editar la URL
            linkContent = `<input class="editable" value="${item.url || ''}" placeholder="Pegar URL aquí" onchange="stockData[${i}].url=this.value">`;
        } else {
            // El público ve el texto "Ver Producto" si hay una URL
            linkContent = item.url 
                ? `<a href="${item.url}" target="_blank" class="ver-link">VER PRODUCTO</a>` 
                : `<span style="color:#ccc">No disponible</span>`;
        }

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

// --- FUNCIONES DE ADMIN ---
async function activarModoAdmin() {
    const token = document.getElementById('github-token').value.trim();
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
        renderTabla();
    } catch (e) { alert("Token inválido o ruta incorrecta"); }
}

function agregarFila() {
    stockData.push({ marca: "", producto: "", stock: 0, url: "" });
    renderTabla();
}

function eliminarFila(i) {
    if(confirm("¿Borrar?")) { stockData.splice(i, 1); renderTabla(); }
}

async function guardarCambios() {
    const token = localStorage.getItem("adminToken");
    const btn = document.getElementById('btn-save');
    btn.innerText = "⏳ Guardando...";
    
    const content = btoa(new TextEncoder().encode(JSON.stringify(stockData, null, 2)).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Update", content: content, sha: shaFile })
        });
        if (res.ok) {
            const resData = await res.json();
            shaFile = resData.content.sha;
            alert("✅ Guardado");
        }
    } catch (e) { alert("Error al guardar"); }
    btn.innerText = "💾 Guardar Cambios";
}