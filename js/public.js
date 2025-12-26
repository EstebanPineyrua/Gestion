// public.js — muestra los registros (solo lectura)
async function loadPublicRecords(){
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    if(!res.ok) throw new Error("No se pudo cargar records.json");
    const data = await res.json();
    const tbody = document.getElementById("records-body");
    tbody.innerHTML = "";
    if(data.length === 0){
      tbody.innerHTML = `<tr><td colspan="4">No hay pagos registrados.</td></tr>`;
      return;
    }
    data.slice().reverse().forEach(rec => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(rec.cliente)}</td>
                      <td>${escapeHtml(rec.producto)}</td>
                      <td>$${Number(rec.monto).toLocaleString('es-AR')}</td>
                      <td>${new Date(rec.fecha).toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    const tbody = document.getElementById("records-body");
    tbody.innerHTML = `<tr><td colspan="4">Error cargando registros: ${err.message}</td></tr>`;
  }
}

function escapeHtml(str){
  if(!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

document.addEventListener("DOMContentLoaded", loadPublicRecords);
