const GITHUB_USERNAME = "EstebanPineyrua"; 
const REPO_NAME = "Gestion";          
const FILE_PATH = "stock.json";       

let stockData = [];
let shaFile = "";
let isAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
    const tokenGuardado = localStorage.getItem("adminToken");
    if (tokenGuardado) document.getElementById('github-token').value = tokenGuardado;
    cargarStockPublico();
});

async function cargarStockPublico() {
    document.getElementById('loading').style.display = 'block';
    try {
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${FILE_PATH}?t=${Date.now()}`;
        const response = await fetch(url);
        stockData = await response.json();
        renderTabla();
    } catch (e) {
        document.getElementById('status-msg').innerText = "⚠️ Error al cargar datos.";
    }
    document.getElementById('loading').style.display = 'none';
}

async function activarModoAdmin() {
    const token = document.getElementById('github-token').value.trim();
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        shaFile = data.sha;
        isAdmin = true;
        localStorage.setItem("adminToken", token);
        document.getElementById('github-token').style.display = 'none';
        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('btn-save').style.display = 'inline-block';
        document.getElementById('btn-add').style.display = 'inline-block';
        document.getElementById('col-acciones').style.display = 'table-cell';
        renderTabla();
    } catch (e) { alert("Token inválido"); }
}

function renderTabla() {
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = "";
    stockData.forEach((item, i) => {
        const row = document.createElement('tr');
        if(isAdmin) row.classList.add('editing');
        row.innerHTML = `
            <td><input class="editable" value="${item.producto}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].producto=this.value"></td>
            <td><input type="number" class="editable" value="${item.cantidad}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].cantidad=Number(this.value)"></td>
            <td><input type="number" class="editable" value="${item.precio}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].precio=Number(this.value)"></td>
            ${isAdmin ? `<td><button onclick="eliminarFila(${i})" class="btn-del">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(row);
    });
}

function agregarFila() {
    stockData.push({ id: Date.now(), producto: "Nuevo", cantidad: 0, precio: 0 });
    renderTabla();
}

function eliminarFila(i) {
    stockData.splice(i, 1);
    renderTabla();
}

async function guardarCambios() {
    const token = localStorage.getItem("adminToken");
    const btn = document.getElementById('btn-save');
    btn.innerText = "Guardando...";
    
    const content = btoa(new TextEncoder().encode(JSON.stringify(stockData, null, 2)).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Update stock", content: content, sha: shaFile })
        });
        if (res.ok) {
            const resData = await res.json();
            shaFile = resData.content.sha;
            alert("✅ ¡Guardado!");
        }
    } catch (e) { alert("Error al guardar"); }
    btn.innerText = "💾 Guardar Cambios";
}