// 1. Reemplazá esto con la URL que te dio Apps Script al implementar la Web App
const URL_API = "https://script.google.com/macros/s/AKfycbwyTo1ezN1D2LOLeV6l1Is6dPSJ8lI2z9C_zGoFWW6gSHj68Yes3DxChP_QSTX3eW1k/exec";

// Variables globales para guardar los datos y referenciar el DOM
let eventosGlobales = [];
const cuerpoTabla = document.getElementById("cuerpoTabla");
const filtroCarrera = document.getElementById("filtroCarrera");
const filtroInstancia = document.getElementById("filtroInstancia");

// 2. Función principal que arranca al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Hacemos la petición a tu API
        const respuesta = await fetch(URL_API);
        const datos = await respuesta.json();

        eventosGlobales = datos;

        // Llenamos el select de carreras dinámicamente
        poblarFiltroCarreras(datos);

        // Renderizamos la tabla por primera vez
        renderizarTabla(datos);
        console.log(datos);

    } catch (error) {
        console.error("Error al obtener los eventos:", error);
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <strong>Error de conexión.</strong> No se pudieron cargar las fechas. Por favor, recargá la página.
                </td>
            </tr>
        `;
    }
});

function renderizarTabla(eventosParaMostrar) {
    cuerpoTabla.innerHTML = "";

    if (eventosParaMostrar.length === 0) {
        cuerpoTabla.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    No se encontraron parciales para estos filtros.
                </td>
            </tr>
        `;
        return;
    }

    // Recorremos el array y creamos una fila por cada evento
    eventosParaMostrar.forEach(evento => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td class="fw-semibold">${evento.Carrera || "-"}</td>
            <td>${evento.Materia + " - " +evento.TipodeEvento || "-"}</td>
            <td>${evento.Fecha || "-"}</td>
            <td class="text-nowrap">${evento.Hora || "-"}</td>
            <td>${evento.Espacios || "-"}</td>
            <td class="text-muted small">${evento.Observaciones || ""}</td>
        `;
        cuerpoTabla.appendChild(fila);
    });
}

// 4. Función para que el filtro de Carreras se llene solo
function poblarFiltroCarreras(eventos) {
    // Extraemos solo los nombres de las carreras y quitamos los duplicados usando un Set
    const carrerasUnicas = [...new Set(eventos.map(e => e.Carrera))].filter(Boolean);

    // Agregamos cada carrera como un <option> nuevo
    carrerasUnicas.forEach(carrera => {
        const opcion = document.createElement("option");
        opcion.value = carrera;
        opcion.textContent = carrera;
        filtroCarrera.appendChild(opcion);
    });
}

// 5. Lógica de los filtros cruzados
function aplicarFiltros() {
    const valorCarrera = filtroCarrera.value;
    const valorInstancia = filtroInstancia.value;

    // Filtramos el array global que guardamos al principio
    const eventosFiltrados = eventosGlobales.filter(evento => {
        const coincideCarrera = (valorCarrera === "") || (evento.Carrera === valorCarrera);
        const coincideInstancia = (valorInstancia === "") || (evento.TipodeEvento === valorInstancia);

        // Solo pasa si cumple con AMBOS filtros
        return coincideCarrera && coincideInstancia;
    });

    // Volvemos a pintar la tabla con la lista reducida
    renderizarTabla(eventosFiltrados);
}

// 6. Escuchamos cuando el usuario cambia algo en los <select>
filtroCarrera.addEventListener("change", aplicarFiltros);
filtroInstancia.addEventListener("change", aplicarFiltros);
document.getElementById("btnPDF").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); 

    // --- 1. LÓGICA DE TÍTULO DINÁMICO ---
    // Capturamos lo que el usuario eligió en los filtros
    const valCarrera = filtroCarrera.value;
    const valInstancia = filtroInstancia.value;

    let subtituloDinamico = "";

    // Evaluamos las combinaciones
    if (valCarrera === "" && valInstancia === "") {
        subtituloDinamico = "Todas las evaluaciones cargadas";
    } else {
        // Operadores ternarios para armar la frase
        let textoCarrera = valCarrera !== "" ? valCarrera : "Todas las carreras";
        let textoInstancia = valInstancia !== "" ? valInstancia : "Todas las instancias";
        
        subtituloDinamico = `${textoCarrera} | ${textoInstancia}`;
    }

    // --- 2. TÍTULO Y ESTÉTICA DEL PDF ---
    doc.setFontSize(18);
    doc.text("Calendario de Parciales - FACET", 14, 15);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    // Inyectamos nuestro subtítulo dinámico acá
    doc.text(subtituloDinamico, 14, 22); 

    // --- 3. GENERAR LA TABLA ---
    doc.autoTable({
        html: '#tablaEventos', 
        startY: 30,            
        theme: 'grid',         
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }, 
        margin: { horizontal: 10 },
        didParseCell: function (data) {
            if (data.section === 'body' && data.cell.text[0].includes('No se encontraron parciales')) {
                return false;
            }
        }
    });

    // --- 4. NOMBRE DEL ARCHIVO TAMBIÉN DINÁMICO ---
    const fechaHoy = new Date().toLocaleDateString().replace(/\//g, "-");
    
    // Armamos un nombre de archivo prolijo para que no se llame siempre igual
    let prefijoArchivo = valCarrera !== "" ? valCarrera.replace(/\s/g, "_") : "Completo";
    doc.save(`Parciales_${prefijoArchivo}_${fechaHoy}.pdf`);
});