let escaner = null;
let escaneando = false;


function buscarProducto() {

    const campoSku =
        document.getElementById("sku");

    const skuIngresado =
        campoSku.value.trim();

    const mensaje =
        document.getElementById("mensaje");

    mensaje.textContent = "";

    const productoEncontrado =
        productos.find(
            producto => producto.sku === skuIngresado
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
            "No encontramos un producto asociado a ese SKU.";

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


async function abrirEscaner() {

    const modal =
        document.getElementById("modalEscaner");

    modal.classList.add("activo");

    if (!escaner) {
        escaner =
            new Html5Qrcode("lector");
    }

    if (escaneando) {
        return;
    }

    try {

        escaneando = true;

        await escaner.start(

            {
                facingMode: "environment"
            },

            {
                fps: 10,

                qrbox: {
                    width: 280,
                    height: 160
                },

                aspectRatio: 1.5
            },

            async function(codigoDetectado) {

                document.getElementById("sku").value =
                    codigoDetectado;

                await cerrarEscaner();

                buscarProducto();
            },

            function() {
                // Se ignoran lecturas incompletas.
            }
        );

    } catch (error) {

        escaneando = false;

        document.getElementById("mensaje").textContent =
            "No fue posible abrir la cámara. Revisa los permisos del navegador.";

        modal.classList.remove("activo");

        console.error(error);
    }
}


async function cerrarEscaner() {

    const modal =
        document.getElementById("modalEscaner");

    modal.classList.remove("activo");

    if (
        escaner &&
        escaneando
    ) {

        try {

            await escaner.stop();

            await escaner.clear();

        } catch (error) {

            console.error(error);
        }

        escaner = null;

        escaneando = false;
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