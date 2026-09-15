import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";

import "../../styles/admin/cv-recibidos.css";

function CVRecibidos({
    applications = [],
    jobs = [],
}) {
    // =====================================================
    // ESTADOS
    // =====================================================

    const [search, setSearch] = useState("");

    const [tipoFiltro, setTipoFiltro] =
        useState("Todos los tipos");

    const [estadoFiltro, setEstadoFiltro] =
        useState("Todos los estados");

    const [perfilSeleccionado, setPerfilSeleccionado] =
        useState(null);

    const [postulacionesSeleccionadas, setPostulacionesSeleccionadas] =
        useState(null);

    // =====================================================
    // OBTENER VACANTE RELACIONADA
    // =====================================================

    const obtenerVacante = (application) => {
        if (!application) {
            return null;
        }

        return (
            jobs.find(
                (job) =>
                    String(job.id) ===
                    String(application.jobId)
            ) || null
        );
    };

    // =====================================================
    // CONVERTIR APPLICATION A REGISTRO DE CV
    // =====================================================

    const candidatos = useMemo(() => {

        if (!Array.isArray(applications)) {
            return [];
        }

        return applications.map(
            (application, index) => {

                const job =
                    obtenerVacante(
                        application
                    );

                return {
                    ...application,

                    id:
                        application.id ??
                        `application-${index}`,

                    nombre:
                        application.candidateName ||
                        application.nombre ||
                        "Postulante",

                    profesion:
                        application.profession ||
                        application.profesion ||
                        "Perfil profesional no especificado",

                    vacante:
                        application.jobTitle ||
                        application.vacante ||
                        job?.title ||
                        "Vacante no disponible",

                    organizacion:
                        application.orgName ||
                        application.organizacion ||
                        job?.org ||
                        "Organización no disponible",

                    tipo:
                        application.type ||
                        application.tipo ||
                        job?.type ||
                        "No especificado",

                    fecha:
                        application.date ||
                        application.fecha ||
                        application.createdAt ||
                        "Sin fecha",

                    estado:
                        application.status ||
                        application.estado ||
                        "Pendiente",

                    correo:
                        application.candidateEmail ||
                        application.email ||
                        application.correo ||
                        "No disponible",

                    telefono:
                        application.phone ||
                        application.telefono ||
                        "No disponible",

                    cv:
                        application.cvName ||
                        application.cv ||
                        "CV no especificado",

                    experiencia:
                        application.experience ||
                        application.experiencia ||
                        "No se ha registrado información adicional.",

                    jobData:
                        job,
                };
            }
        );

    }, [applications, jobs]);

    // =====================================================
    // FILTRADO
    // =====================================================

    const filtered = useMemo(() => {

        return candidatos.filter(
            (item) => {

                const texto = `
                    ${item.nombre}
                    ${item.profesion}
                    ${item.vacante}
                    ${item.organizacion}
                    ${item.tipo}
                    ${item.estado}
                    ${item.correo}
                `.toLowerCase();

                const coincideBusqueda =
                    texto.includes(
                        search.toLowerCase()
                    );

                const coincideTipo =
                    tipoFiltro ===
                        "Todos los tipos" ||
                    item.tipo ===
                        tipoFiltro;

                const coincideEstado =
                    estadoFiltro ===
                        "Todos los estados" ||
                    item.estado ===
                        estadoFiltro;

                return (
                    coincideBusqueda &&
                    coincideTipo &&
                    coincideEstado
                );
            }
        );

    }, [
        candidatos,
        search,
        tipoFiltro,
        estadoFiltro,
    ]);

    // =====================================================
    // ABRIR PERFIL
    // =====================================================

    const abrirPerfil = (postulante) => {

        setPostulacionesSeleccionadas(
            null
        );

        setPerfilSeleccionado(
            postulante
        );
    };

    // =====================================================
    // CERRAR PERFIL
    // =====================================================

    const cerrarPerfil = () => {
        setPerfilSeleccionado(null);
    };

    // =====================================================
    // HISTORIAL DE POSTULACIONES
    // =====================================================

    const abrirPostulaciones = (
        postulante
    ) => {

        const historial =
            candidatos.filter(
                (item) => {

                    const mismoCorreo =
                        item.correo &&
                        postulante.correo &&
                        item.correo ===
                            postulante.correo;

                    const mismoNombre =
                        item.nombre &&
                        postulante.nombre &&
                        item.nombre ===
                            postulante.nombre;

                    return (
                        mismoCorreo ||
                        mismoNombre
                    );
                }
            );

        setPerfilSeleccionado(null);

        setPostulacionesSeleccionadas({
            candidato: postulante,
            historial,
        });
    };

    // =====================================================
    // CERRAR HISTORIAL
    // =====================================================

    const cerrarPostulaciones = () => {
        setPostulacionesSeleccionadas(
            null
        );
    };

    // =====================================================
    // GENERAR PDF
    // =====================================================

    const generarPDF = (
        postulante
    ) => {

        if (!postulante) {
            return;
        }

        const doc = new jsPDF();

        const margen = 20;

        let y = 25;

        // -------------------------------------------------
        // ENCABEZADO
        // -------------------------------------------------

        doc.setFontSize(20);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            "FQA Empleos",
            margen,
            y
        );

        y += 10;

        doc.setFontSize(11);

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            "Perfil del postulante",
            margen,
            y
        );

        y += 15;

        // -------------------------------------------------
        // INFORMACIÓN DEL CANDIDATO
        // -------------------------------------------------

        doc.setFontSize(16);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            postulante.nombre,
            margen,
            y
        );

        y += 9;

        doc.setFontSize(11);

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            `Perfil: ${postulante.profesion}`,
            margen,
            y
        );

        y += 7;

        doc.text(
            `Correo: ${postulante.correo}`,
            margen,
            y
        );

        y += 7;

        doc.text(
            `Teléfono: ${postulante.telefono}`,
            margen,
            y
        );

        y += 15;

        // -------------------------------------------------
        // POSTULACIÓN
        // -------------------------------------------------

        doc.setFontSize(13);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            "Postulación",
            margen,
            y
        );

        y += 9;

        doc.setFontSize(11);

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            `Vacante: ${postulante.vacante}`,
            margen,
            y
        );

        y += 7;

        doc.text(
            `Organización: ${postulante.organizacion}`,
            margen,
            y
        );

        y += 7;

        doc.text(
            `Tipo: ${postulante.tipo}`,
            margen,
            y
        );

        y += 7;

        doc.text(
            `Fecha: ${postulante.fecha}`,
            margen,
            y
        );

        y += 7;

        doc.text(
            `Estado: ${postulante.estado}`,
            margen,
            y
        );

        y += 15;

        // -------------------------------------------------
        // CV
        // -------------------------------------------------

        doc.setFontSize(13);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            "Documento registrado",
            margen,
            y
        );

        y += 9;

        doc.setFontSize(11);

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            `CV: ${postulante.cv}`,
            margen,
            y
        );

        y += 15;

        // -------------------------------------------------
        // INFORMACIÓN ADICIONAL
        // -------------------------------------------------

        doc.setFontSize(13);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            "Información adicional",
            margen,
            y
        );

        y += 9;

        doc.setFontSize(11);

        doc.setFont(
            "helvetica",
            "normal"
        );

        const experiencia =
            postulante.experiencia ||
            "No se ha registrado información adicional.";

        const lineas =
            doc.splitTextToSize(
                experiencia,
                170
            );

        doc.text(
            lineas,
            margen,
            y
        );

        // -------------------------------------------------
        // PIE
        // -------------------------------------------------

        const fechaGeneracion =
            new Date().toLocaleDateString(
                "es-SV"
            );

        doc.setFontSize(9);

        doc.setTextColor(
            110,
            110,
            110
        );

        doc.text(
            `Documento generado por FQA Empleos - ${fechaGeneracion}`,
            margen,
            285
        );

        // -------------------------------------------------
        // NOMBRE DEL ARCHIVO
        // -------------------------------------------------

        const nombreArchivo =
            `FQA-${postulante.nombre
                .replace(
                    /\s+/g,
                    "-"
                )
                .replace(
                    /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ-]/g,
                    ""
                )}.pdf`;

        doc.save(
            nombreArchivo
        );
    };

    // =====================================================
    // ESTADO VISUAL
    // =====================================================

    const obtenerClaseEstado = (
        estado
    ) => {

        const normalizado =
            String(estado)
                .toLowerCase()
                .normalize("NFD")
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                );

        if (
            normalizado.includes(
                "seleccion"
            )
        ) {
            return "selected";
        }

        if (
            normalizado.includes(
                "rechaz"
            )
        ) {
            return "rejected";
        }

        if (
            normalizado.includes(
                "revision"
            )
        ) {
            return "review";
        }

        return "received";
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="cv-recibidos-screen">
            
            <section>

                {/* =================================================
                    HEADER
                ================================================= */}

            


                {/* =================================================
                    BARRA DE HERRAMIENTAS
                ================================================= */}

                <div className="cv-recibidos-toolbar">

                    <input
                        type="text"
                        placeholder="Buscar postulante..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />


                    <select
                        value={tipoFiltro}
                        onChange={(e) =>
                            setTipoFiltro(
                                e.target.value
                            )
                        }
                    >

                        <option value="Todos los tipos">
                            Todos los tipos
                        </option>

                        <option value="Empleo">
                            Empleo
                        </option>

                        <option value="Horas Sociales">
                            Horas Sociales
                        </option>

                        <option value="Horas sociales">
                            Horas sociales
                        </option>

                        <option value="Práctica Profesional">
                            Práctica Profesional
                        </option>

                        <option value="Prácticas profesionales">
                            Prácticas profesionales
                        </option>

                        <option value="Voluntariado">
                            Voluntariado
                        </option>

                    </select>


                    <select
                        value={estadoFiltro}
                        onChange={(e) =>
                            setEstadoFiltro(
                                e.target.value
                            )
                        }
                    >

                        <option value="Todos los estados">
                            Todos los estados
                        </option>

                        <option value="Pendiente">
                            Pendiente
                        </option>

                        <option value="Recibido">
                            Recibido
                        </option>

                        <option value="En revisión">
                            En revisión
                        </option>

                        <option value="Seleccionado">
                            Seleccionado
                        </option>

                        <option value="Rechazado">
                            Rechazado
                        </option>

                    </select>

                </div>


                {/* =================================================
                    TABLA
                ================================================= */}

                <div className="cv-recibidos-table-box">

                    <div className="table-responsive">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Postulante
                                    </th>

                                    <th>
                                        Perfil
                                    </th>

                                    <th>
                                        Vacante
                                    </th>

                                    <th>
                                        Tipo
                                    </th>

                                    <th>
                                        Fecha
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Acciones
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {filtered.length > 0 ? (

                                    filtered.map(
                                        (item) => (

                                            <tr
                                                key={
                                                    item.id
                                                }
                                            >

                                                <td>

                                                    <strong>
                                                        {
                                                            item.nombre
                                                        }
                                                    </strong>

                                                </td>


                                                <td>
                                                    {
                                                        item.profesion
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        item.vacante
                                                    }
                                                </td>


                                                <td>

                                                    <span className="cv-recibidos-type">
                                                        {
                                                            item.tipo
                                                        }
                                                    </span>

                                                </td>


                                                <td>
                                                    {
                                                        item.fecha
                                                    }
                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            `cv-recibidos-status ${obtenerClaseEstado(
                                                                item.estado
                                                            )}`
                                                        }
                                                    >

                                                        {
                                                            item.estado
                                                        }

                                                    </span>

                                                </td>


                                                <td>

                                                    <div className="cv-recibidos-actions">

                                                        <button
                                                            type="button"
                                                            className="cv-recibidos-action"
                                                            onClick={() =>
                                                                abrirPerfil(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            Perfil
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="cv-recibidos-action"
                                                            onClick={() =>
                                                                abrirPostulaciones(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            Postulaciones
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="cv-recibidos-action"
                                                            onClick={() =>
                                                                generarPDF(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            PDF
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        )
                                    )

                                ) : (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="cv-recibidos-empty"
                                        >
                                            No se encontraron
                                            postulantes.
                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </section>


            {/* =====================================================
                MODAL PERFIL
            ===================================================== */}

            {perfilSeleccionado &&
                createPortal(

                    <div
                        className="cv-perfil-overlay"
                        onMouseDown={(e) => {

                            if (
                                e.target.classList.contains(
                                    "cv-perfil-overlay"
                                )
                            ) {
                                cerrarPerfil();
                            }

                        }}
                    >

                        <div className="cv-perfil-modal">

                            {/* HEADER */}

                            <div className="cv-perfil-modal-header">

                                <div>

                                    <span className="cv-perfil-label">
                                        PERFIL DEL POSTULANTE
                                    </span>

                                    <h2>
                                        {
                                            perfilSeleccionado.nombre
                                        }
                                    </h2>

                                    <p>
                                        {
                                            perfilSeleccionado.profesion
                                        }
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    className="cv-perfil-close"
                                    onClick={
                                        cerrarPerfil
                                    }
                                    aria-label="Cerrar perfil"
                                >
                                    ×
                                </button>

                            </div>


                            {/* CONTENIDO */}

                            <div className="cv-perfil-modal-body">

                                <div className="cv-perfil-section">

                                    <h3>
                                        Información personal
                                    </h3>


                                    <div className="cv-perfil-grid">

                                        <div className="cv-perfil-field">

                                            <span>
                                                Nombre completo
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.nombre
                                                }
                                            </strong>

                                        </div>


                                        <div className="cv-perfil-field">

                                            <span>
                                                Profesión / Perfil
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.profesion
                                                }
                                            </strong>

                                        </div>


                                        <div className="cv-perfil-field">

                                            <span>
                                                Correo electrónico
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.correo
                                                }
                                            </strong>

                                        </div>


                                        <div className="cv-perfil-field">

                                            <span>
                                                Teléfono
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.telefono
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                </div>


                                <div className="cv-perfil-section">

                                    <h3>
                                        Postulación
                                    </h3>


                                    <div className="cv-perfil-grid">

                                        <div className="cv-perfil-field">

                                            <span>
                                                Vacante
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.vacante
                                                }
                                            </strong>

                                        </div>


                                        <div className="cv-perfil-field">

                                            <span>
                                                Organización
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.organizacion
                                                }
                                            </strong>

                                        </div>


                                        <div className="cv-perfil-field">

                                            <span>
                                                Tipo
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.tipo
                                                }
                                            </strong>

                                        </div>


                                        <div className="cv-perfil-field">

                                            <span>
                                                Fecha de postulación
                                            </span>

                                            <strong>
                                                {
                                                    perfilSeleccionado.fecha
                                                }
                                            </strong>

                                        </div>


                                        <div className="cv-perfil-field">

                                            <span>
                                                Estado
                                            </span>

                                            <strong className="cv-perfil-status">
                                                {
                                                    perfilSeleccionado.estado
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                </div>


                                <div className="cv-perfil-section">

                                    <h3>
                                        Documento
                                    </h3>

                                    <p className="cv-perfil-description">
                                        {
                                            perfilSeleccionado.cv
                                        }
                                    </p>

                                </div>


                                <div className="cv-perfil-section">

                                    <h3>
                                        Experiencia /
                                        Información adicional
                                    </h3>

                                    <p className="cv-perfil-description">
                                        {
                                            perfilSeleccionado.experiencia
                                        }
                                    </p>

                                </div>

                            </div>


                            {/* FOOTER */}

                            <div className="cv-perfil-modal-footer">

                                <button
                                    type="button"
                                    className="cv-perfil-secondary"
                                    onClick={
                                        cerrarPerfil
                                    }
                                >
                                    Cerrar
                                </button>


                                <button
                                    type="button"
                                    className="cv-perfil-primary"
                                    onClick={() =>
                                        generarPDF(
                                            perfilSeleccionado
                                        )
                                    }
                                >
                                    Generar PDF
                                </button>

                            </div>

                        </div>

                    </div>,

                    document.body
                )}


            {/* =====================================================
                MODAL POSTULACIONES
            ===================================================== */}

            {postulacionesSeleccionadas &&
                createPortal(

                    <div
                        className="cv-perfil-overlay"
                        onMouseDown={(e) => {

                            if (
                                e.target.classList.contains(
                                    "cv-perfil-overlay"
                                )
                            ) {
                                cerrarPostulaciones();
                            }

                        }}
                    >

                        <div className="cv-perfil-modal">

                            <div className="cv-perfil-modal-header">

                                <div>

                                    <span className="cv-perfil-label">
                                        HISTORIAL DE POSTULACIONES
                                    </span>

                                    <h2>
                                        {
                                            postulacionesSeleccionadas
                                                .candidato
                                                .nombre
                                        }
                                    </h2>

                                    <p>
                                        Historial registrado
                                        en FQA Empleos
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    className="cv-perfil-close"
                                    onClick={
                                        cerrarPostulaciones
                                    }
                                    aria-label="Cerrar historial"
                                >
                                    ×
                                </button>

                            </div>


                            <div className="cv-perfil-modal-body">

                                <div className="cv-perfil-section">

                                    <h3>
                                        Postulaciones registradas
                                    </h3>


                                    {postulacionesSeleccionadas
                                        .historial
                                        .length > 0 ? (

                                        postulacionesSeleccionadas
                                            .historial
                                            .map(
                                                (
                                                    postulacion
                                                ) => (

                                                    <div
                                                        key={
                                                            postulacion.id
                                                        }
                                                        className="cv-postulacion-history-item"
                                                    >

                                                        <strong>
                                                            {
                                                                postulacion.vacante
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                postulacion.organizacion
                                                            }
                                                        </span>

                                                        <span>
                                                            Tipo:{" "}
                                                            {
                                                                postulacion.tipo
                                                            }
                                                        </span>

                                                        <span>
                                                            Fecha:{" "}
                                                            {
                                                                postulacion.fecha
                                                            }
                                                        </span>

                                                        <span className="cv-perfil-status">
                                                            {
                                                                postulacion.estado
                                                            }
                                                        </span>

                                                    </div>

                                                )
                                            )

                                    ) : (

                                        <p className="cv-perfil-description">
                                            No existen
                                            postulaciones
                                            registradas.
                                        </p>

                                    )}

                                </div>

                            </div>


                            <div className="cv-perfil-modal-footer">

                                <button
                                    type="button"
                                    className="cv-perfil-secondary"
                                    onClick={
                                        cerrarPostulaciones
                                    }
                                >
                                    Cerrar
                                </button>

                            </div>

                        </div>

                    </div>,

                    document.body
                )}

        </div>
    );
}

export default CVRecibidos;