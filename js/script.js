const firebaseConfig = {
  apiKey: "AIzaSyDvtibDrtz0VmidYlHe7dkdRqQm68UyQts",
  authDomain: "gestion-7eae0.firebaseapp.com",
  databaseURL: "https://gestion-7eae0-default-rtdb.firebaseio.com",
  projectId: "gestion-7eae0",
  storageBucket: "gestion-7eae0.firebasestorage.app",
  messagingSenderId: "790154978396",
  appId: "1:790154978396:web:753715b93fb84b55673299"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let stockData = [];
let isAdmin = false;

// Sincronización en tiempo real
db.ref("productos").on("value", (snapshot) => {
    const data = snapshot.val();
    stockData = data ? Object.values(data) : [];
    renderTabla();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('status-msg').innerHTML = "🟢 <span style='color:black'>Conectado y Sincronizado</span>";
});

function activarModoAdmin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "Meki") { 
        isAdmin = true;
        document.getElementById('admin-controls').style.display = 'flex';
        document.getElementById('admin-pass').style.display = 'none';
        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('col-acciones').style.display = 'table-cell';
        renderTabla();
    } else {
        alert("Clave incorrecta");
    }
}

function renderTabla() {
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = "";
    stockData.forEach((item, i) => {
        const row = document.createElement('tr');
        if(isAdmin) row.classList.add('editing');

        let linkCol = isAdmin 
            ? `<input class="editable" value="${item.url || ''}" placeholder="Pegar URL aquí" onchange="stockData[${i}].url=this.value">`
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

function agregarFila() {
    stockData.push({ marca: "Nueva", producto: "Producto", stock: 0, url: "" });
    renderTabla();
}

function eliminarFila(i) {
    if(confirm("¿Eliminar este producto permanentemente?")) {
        stockData.splice(i, 1);
        renderTabla();
    }
}

async function guardarCambios() {
    if (!isAdmin) return;
    const btn = document.getElementById('btn-save');
    btn.innerText = "⏳ Guardando...";
    try {
        await db.ref("productos").set(stockData);
        alert("✅ Stock actualizado correctamente");
    } catch (e) {
        alert("Error: " + e.message);
    }
    btn.innerText = "💾 Guardar";
}

function cerrarSesion() { location.reload(); }