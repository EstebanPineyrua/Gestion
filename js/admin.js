// admin.js — panel admin que lee/escribe en data/records.json usando GitHub API.
// INSTRUCCIONES: reemplaza OWNER y REPO por tu usuario/organización y repo si quieres.
// Alternativamente, ingrésalos en los inputs del formulario y pulsa "Cargar".

// Helpers para base64 UTF-8
function base64Encode(str){
  return btoa(unescape(encodeURIComponent(str)));
}
function base64Decode(b64){
  return decodeURIComponent(escape(atob(b64)));
}

// Estado global (se llenan al loguear)
let GITHUB_TOKEN = "";
let OWNER = "";
let REPO = "";
const PATH = "data/records.json";

const statusEl = () => document.getElementById("login-status");
const addStatusEl = () => document.getElementById("add-status");

document.getElementById("btn-login").addEventListener("click", () => {
  GITHUB_TOKEN = document.getElementById("token").value.trim();
  OWNER = document.getElementById("owner").value.trim();
  REPO = document.getElementById("repo").value.trim();
  if(!GITHUB_TOKEN || !OWNER || !REPO){
    statusEl().textContent = "Completá token, owner y repo.";
    return;
  }
  statusEl().textContent = "Token cargado. Cargando registros...";
  loadAdminRecords();
});

// Obtener archivo desde GitHub (devuelve json y sha)
async function obtenerRecords(){
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  if(!res.ok) throw new Error("Error al obtener archivo: " + res.status + " " + res.statusText);
  const data = await res.json();
  const contenido = base64Decode(data.content);
  return { json: JSON.parse(contenido), sha: data.sha };
}

// Guardar archivo en repo (commit)
async function guardarRecords(json, sha, message = "Actualizar registros desde Admin UI"){
  const content = base64Encode(JSON.stringify(json, null, 2));
  const body = {
    message,
    content,
    sha
  };
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const txt = await res.text();
    throw new Error("Error al guardar: " + res.status + " " + txt);
  }
  return await res.json();
}

// UI: cargar y pintar tabla admin
async function loadAdminRecords(){
  try {
    const { json } = await obtenerRecords();
    renderAdminTable(json);
    statusEl().textContent = "Registros cargados. Puedes editar o borrar.";
  } catch (err){
    statusEl().textContent = "Error: " + err.message;
    console.error(err);
  }
}

function renderAdminTable(records){
  const tbody = document.getElementById("admin-body");
  tbody.innerHTML = "";
  if(!records || records.length === 0){
    tbody.innerHTML = `<tr><td colspan="5">No hay registros.</td></tr>`;
    return;
  }
  records.slice().reverse().forEach(rec => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(rec.cliente)}</td>
                    <td>${escapeHtml(rec.producto)}</td>
                    <td>$${Number(rec.monto).toLocaleString('es-AR')}</td>
                    <td>${new Date(rec.fecha).toLocaleString()}</td>
                    <td>
                      <button class="action-btn" data-id="${rec.id}" data-action="edit">Editar</button>
                      <button class="action-btn" data-id="${rec.id}" data-action="delete">Borrar</button>
                    </td>`;
    tbody.appendChild(tr);
  });
}

// escapeHtml reused
function escapeHtml(str){
  if(!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Agregar pago
document.getElementById("btn-add").addEventListener("click", async () => {
  const cliente = document.getElementById("cliente").value.trim();
  const producto = document.getElementById("producto").value.trim();
  const monto = Number(document.getElementById("monto").value);
  if(!cliente || !producto || !monto) { addStatusEl().textContent = "Completá todos los campos."; return; }
  addStatusEl().textContent = "Guardando...";
  try {
    const { json, sha } = await obtenerRecords();
    const nuevo = {
      id: Date.now(),
      cliente,
      producto,
      monto,
      fecha: new Date().toISOString()
    };
    json.push(nuevo);
    await guardarRecords(json, sha, `Agregar pago: ${cliente} - ${producto} - ${monto}`);
    addStatusEl().textContent = "Pago agregado correctamente.";
    // limpiar inputs y recargar
    document.getElementById("cliente").value = "";
    document.getElementById("producto").value = "";
    document.getElementById("monto").value = "";
    loadAdminRecords();
    // también actualizar el public cache si estás en la misma rama (no automático para GitHub Pages cache)
  } catch (err){
    addStatusEl().textContent = "Error: " + err.message;
  }
});

// Delegación de clicks para editar/borrar
document.getElementById("admin-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if(!btn) return;
  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  if(action === "edit") openEditModal(Number(id));
  if(action === "delete") deleteRecord(Number(id));
});

// Modal manejo
const modal = document.getElementById("modal");
let editingId = null;
function openEditModal(id){
  editingId = id;
  // cargar valores del registro
  obtenerRecords().then(({json}) => {
    const rec = json.find(r => r.id === id);
    if(!rec) return alert("Registro no encontrado");
    document.getElementById("edit-cliente").value = rec.cliente;
    document.getElementById("edit-producto").value = rec.producto;
    document.getElementById("edit-monto").value = rec.monto;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }).catch(err => alert("Error cargando registro: " + err.message));
}

document.getElementById("btn-cancel-edit").addEventListener("click", () => {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  editingId = null;
});

document.getElementById("btn-save-edit").addEventListener("click", async () => {
  const cliente = document.getElementById("edit-cliente").value.trim();
  const producto = document.getElementById("edit-producto").value.trim();
  const monto = Number(document.getElementById("edit-monto").value);
  if(!cliente || !producto || !monto) { document.getElementById("edit-status").textContent = "Completá todos los campos."; return; }
  document.getElementById("edit-status").textContent = "Guardando cambios...";
  try {
    const { json, sha } = await obtenerRecords();
    const idx = json.findIndex(r => r.id === editingId);
    if(idx === -1) throw new Error("Registro no encontrado");
    json[idx].cliente = cliente;
    json[idx].producto = producto;
    json[idx].monto = monto;
    // opcional: actualizar fecha de edición
    json[idx].fecha = new Date().toISOString();
    await guardarRecords(json, sha, `Editar pago id:${editingId}`);
    document.getElementById("edit-status").textContent = "Guardado.";
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    editingId = null;
    loadAdminRecords();
  } catch (err){
    document.getElementById("edit-status").textContent = "Error: " + err.message;
  }
});

// Borrar registro
async function deleteRecord(id){
  if(!confirm("Confirmar borrado de registro?")) return;
  try {
    const { json, sha } = await obtenerRecords();
    const newJson = json.filter(r => r.id !== id);
    await guardarRecords(newJson, sha, `Borrar pago id:${id}`);
    loadAdminRecords();
  } catch (err){
    alert("Error al borrar: " + err.message);
  }
}
