
const GITHUB_USERNAME = "EstebanPineyrua"; 
const REPO_NAME = "Gestion";           
const FILE_PATH = "data/stock.json";  

let stockData = [];
let shaFile = ""; // Este código identifica la versión del archivo para GitHub
let isAdmin = false;

// 1. Cargar datos apenas abre la página
document.addEventListener("DOMContentLoaded", () => {
    const tokenGuardado = localStorage.getItem("adminToken");
    if (tokenGuardado) {
        document.getElementById('github-token').value = tokenGuardado;
    }
    cargarStockPublico();
});

// 2. Leer el archivo JSON (Lo que ve todo el mundo)
async function cargarStockPublico() {
    const loading = document.getElementById('loading');
    const status = document.getElementById('status-msg');
    loading.style.display = 'block';

    try {
        // Usamos la URL de "raw" para que los cambios se vean más rápido
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${FILE_PATH}?t=${Date.now()}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error("No se pudo cargar el archivo JSON");
        
        stockData = await response.json();
        renderTabla();
    } catch (e) {
        status.innerText = "⚠️ Error: No se encontró el archivo en " + FILE_PATH;
        status.style.color = "red";
    } finally {
        loading.style.display = 'none';
    }
}

// 3. Login de Admin (Obtiene el SHA necesario para escribir)
async function activarModoAdmin() {
    const token = document.getElementById('github-token').value.trim();
    if (!token) return alert("Por favor, ingresa tu Token.");

    try {
        // Consultamos la API de GitHub para obtener el SHA del archivo actual
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Token inválido o permisos insuficientes.");

        const data = await response.json();
        shaFile = data.sha; // GUARDAMOS EL SHA (Sin esto no se puede guardar)
        isAdmin = true;
        
        localStorage.setItem("adminToken", token); // Guardar para la próxima vez

        // Cambiar interfaz
        document.getElementById('admin-controls').style.display = 'flex';
        document.getElementById('github-token').style.display = 'none';
        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('status-msg').innerText = "✅ Modo Admin: Puedes editar y guardar.";
        document.getElementById('status-msg').style.color = "green";
        
        renderTabla();
    } catch (e) {
        alert("Error de acceso. Revisa que el Token tenga permisos de 'Contents: Write'.");
    }
}

// 4. Dibujar la tabla en pantalla
function renderTabla() {
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = "";
    
    stockData.forEach((item, i) => {
        const row = document.createElement('tr');
        if(isAdmin) row.classList.add('editing');

        // Lógica de la columna VER PRODUCTO
        let linkCol = isAdmin 
            ? `<input class="editable" value="${item.url || ''}" placeholder="Pegar Link" onchange="stockData[${i}].url=this.value">`
            : (item.url ? `<a href="${item.url}" target="_blank" class="ver-link">VER PRODUCTO</a>` : "-");

        row.innerHTML = `
            <td><input class="editable" value="${item.marca || ''}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].marca=this.value"></td>
            <td><input class="editable" value="${item.producto || ''}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].producto=this.value"></td>
            <td><input type="number" class="editable" value="${item.stock || 0}" ${isAdmin?'':'disabled'} onchange="stockData[${i}].stock=Number(this.value)"></td>
            <td>${linkCol}</td>
            ${isAdmin ? `<td><button onclick="eliminarFila(${i})" class="btn-del">🗑️</button></td>` : ''}
        `;
        tbody.appendChild(row);
    });
}

// 5. Funciones de edición
function agregarFila() {
    stockData.push({ marca: "", producto: "", stock: 0, url: "" });
    renderTabla();
}

function eliminarFila(i) {
    if(confirm("¿Borrar este producto?")) {
        stockData.splice(i, 1);
        renderTabla();
    }
}

// 6. GUARDAR EN GITHUB (Esto reemplaza a GitHub Desktop)
async function guardarCambios() {
    const token = localStorage.getItem("adminToken");
    const btn = document.getElementById('btn-save');
    if (!token || !isAdmin) return;

    btn.innerText = "⏳ Guardando en GitHub...";
    btn.disabled = true;

    // Convertir el JSON a texto y luego a Base64 (Requisito de GitHub)
    const jsonString = JSON.stringify(stockData, null, 2);
    const contentBase64 = btoa(new TextEncoder().encode(jsonString).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: "PUT",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Actualización de stock desde panel web",
                content: contentBase64,
                sha: shaFile // Enviamos el SHA para que GitHub sepa que estamos editando la versión correcta
            })
        });

        if (response.ok) {
            const resData = await response.json();
            shaFile = resData.content.sha; // Actualizamos el SHA para el próximo guardado
            alert("✅ ¡Cambios guardados exitosamente en la nube!");
        } else {
            const errorData = await response.json();
            alert("❌ Error de GitHub: " + errorData.message);
        }
    } catch (e) {
        alert("❌ Error de conexión al intentar guardar.");
    } finally {
        btn.innerText = "💾 Guardar Cambios";
        btn.disabled = false;
    }
}