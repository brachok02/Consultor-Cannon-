let escaner = null;
let escaneando = false;
let iniciandoEscaner = false;
let lecturaProcesada = false;


function buscarProducto() {

    const campoSku =
        document.getElementById("sku");

    const skuIngresado =
        campoSku.value.trim().toUpperCase();

    const mensaje =
        document.getElementById("mensaje");

    mensaje.textContent = "";

    const productoEncontrado =
        productos.find(
            producto => producto.sku.toUpperCase() === skuIngresado
        );

    if (productoEncontrado) {

        const resultado =
            document.getElementById("resultado");

        resultado.classList.remove("animado");

        void resultado.offsetWidth;

        resultado.classList.add("animado");

        document.getElementById("producto").textContent =
            productoEncontrado.nombre;

        document.getElementById("precioBase").textContent =
            "$" +
            productoEncontrado.precioBase.toLocaleString("es-CL");

        document.getElementById("descuento").textContent =
            productoEncontrado.descuento > 0
                ? productoEncontrado.descuento + "%"
                : "Sin descuento";

        document.getElementById("precioFinal").textContent =
            "$" +
            productoEncontrado.precioFinal.toLocaleString("es-CL");

    } else {

        mensaje.textContent =
            "No encontramos un producto asociado al código: " + skuIngresado + ". Revisa si el código de barras de la etiqueta coincide con el SKU de la base.";

        document.getElementById("producto").textContent =
            "-";

        document.getElementById("precioBase").textContent =
            "-";

        document.getElementById("descuento").textContent =
            "-";

        document.getElementById("precioFinal").textContent =
            "-";
    }

    campoSku.select();
}


function informarEscaner(texto) {
    document.getElementById("estadoEscaner").textContent = texto;
}

let detectorNativo = null;
let temporizadorNativo = null;
let detectorOcupado = false;
let zoomActual = 1;
let linternaActiva = false;
let cerrandoEscaner = false;

function actualizarControlesCamara() {
    const botones = ["zoomMas", "zoomMenos", "linterna"];
    botones.forEach(id => document.getElementById(id).disabled = true);
    if (!escaner || !escaner.isScanning) return;
    try {
        const capacidades = escaner.getRunningTrackCapabilities();
        const zoom = capacidades.zoom;
        const habilitarZoom = zoom && Number.isFinite(zoom.min) && Number.isFinite(zoom.max);
        document.getElementById("zoomMas").disabled = !habilitarZoom;
        document.getElementById("zoomMenos").disabled = !habilitarZoom;
        document.getElementById("linterna").disabled = !capacidades.torch;
        zoomActual = escaner.getRunningTrackSettings().zoom || 1;
    } catch (_) { /* Algunos navegadores no exponen controles. */ }
}

async function cambiarZoom(paso) {
    if (!escaner || !escaner.isScanning) return;
    try {
        const c = escaner.getRunningTrackCapabilities().zoom;
        if (!c) return;
        zoomActual = Math.min(c.max, Math.max(c.min, zoomActual + paso));
        await escaner.applyVideoConstraints({ advanced: [{ zoom: zoomActual }] });
        informarEscaner("Zoom " + zoomActual.toFixed(1) + "x · centra el código y espera 2 segundos.");
    } catch (error) { informarEscaner("No es posible ajustar el zoom en este dispositivo."); }
}

async function alternarLinterna() {
    if (!escaner || !escaner.isScanning) return;
    try {
        const nueva = !linternaActiva;
        await escaner.applyVideoConstraints({ advanced: [{ torch: nueva }] });
        linternaActiva = nueva;
        document.getElementById("linterna").textContent = nueva ? "🔦 Apagar" : "🔦 Linterna";
    } catch (_) { informarEscaner("La linterna no está disponible en este navegador."); }
}

async function codigoLeido(codigo) {
    if (lecturaProcesada || cerrandoEscaner) return;
    lecturaProcesada = true;
    document.getElementById("sku").value = String(codigo).trim().toUpperCase();
    informarEscaner("Código reconocido: " + codigo);
    await cerrarEscaner();
    buscarProducto();
}

async function activarLectorNativo() {
    if (!("BarcodeDetector" in window)) return;
    try {
        const disponibles = await BarcodeDetector.getSupportedFormats();
        const formatos = ["code_128", "code_39", "code_93", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar"]
            .filter(formato => disponibles.includes(formato));
        if (!formatos.length) return;
        detectorNativo = new BarcodeDetector({ formats: formatos });
        temporizadorNativo = setInterval(async () => {
            if (detectorOcupado || lecturaProcesada || !escaner?.isScanning || cerrandoEscaner) return;
            const video = document.querySelector("#lector video");
            if (!video || video.readyState < 2) return;
            detectorOcupado = true;
            try {
                const detectados = await detectorNativo.detect(video);
                if (detectados.length) await codigoLeido(detectados[0].rawValue);
            } catch (_) { /* El otro lector continúa trabajando. */ }
            finally { detectorOcupado = false; }
        }, 350);
    } catch (error) { console.info("Detección nativa no disponible:", error); }
}

async function abrirEscaner() {
    if (iniciandoEscaner || escaneando || cerrandoEscaner) return;
    const modal = document.getElementById("modalEscaner");
    document.getElementById("mensaje").textContent = "";
    modal.classList.add("activo");
    informarEscaner("Preparando cámara trasera...");
    lecturaProcesada = false;
    iniciandoEscaner = true;
    linternaActiva = false;
    document.getElementById("linterna").textContent = "🔦 Linterna";

    try {
        if (!window.Html5Qrcode || !window.Html5QrcodeSupportedFormats) {
            throw new Error("No se cargó la librería de lectura. Comprueba Internet.");
        }
        const F = Html5QrcodeSupportedFormats;
        escaner = new Html5Qrcode("lector", {
            formatsToSupport: [F.CODE_128, F.CODE_39, F.CODE_93, F.EAN_13,
                F.EAN_8, F.UPC_A, F.UPC_E, F.ITF, F.CODABAR, F.QR_CODE],
            verbose: false
        });
        await escaner.start(
            { facingMode: "environment" },
            {
                fps: 15,
                // Todo el encuadre es analizado, sin recortes fijos.
                disableFlip: true,
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            },
            codigoLeido,
            () => {}
        );
        escaneando = true;
        actualizarControlesCamara();
        informarEscaner("Acerca el código hasta verlo nítido, sin reflejos. Prueba el zoom si está disponible.");
        activarLectorNativo(); // Opcional; no reemplaza al lector principal.
    } catch (error) {
        console.error("Error del escáner:", error);
        document.getElementById("mensaje").textContent =
            "No fue posible iniciar el escáner: " + (error?.message || String(error));
        modal.classList.remove("activo");
        if (escaner) {
            try { if (escaner.isScanning) await escaner.stop(); await escaner.clear(); } catch (_) {}
        }
        escaner = null;
        escaneando = false;
    } finally {
        iniciandoEscaner = false;
    }
}

async function cerrarEscaner() {
    if (cerrandoEscaner) return;
    cerrandoEscaner = true;
    clearInterval(temporizadorNativo);
    temporizadorNativo = null;
    detectorNativo = null;
    document.getElementById("modalEscaner").classList.remove("activo");
    const actual = escaner;
    escaner = null;
    try {
        if (actual) {
            if (actual.isScanning) await actual.stop();
            await actual.clear();
        }
    } catch (error) { console.warn("Cierre de cámara:", error); }
    finally {
        escaneando = false;
        iniciandoEscaner = false;
        cerrandoEscaner = false;
        document.querySelectorAll(".controles-camara button").forEach(b => b.disabled = true);
    }
}

document.getElementById("sku").addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {
            buscarProducto();
        }
    }
);


window.addEventListener(
    "load",
    function() {

        document.getElementById("sku").focus();
    }
);