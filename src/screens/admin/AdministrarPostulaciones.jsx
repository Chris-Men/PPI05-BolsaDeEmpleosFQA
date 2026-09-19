import { useEffect, useState } from "react";
import "../../styles/admin/postulaciones.css";

function AdministrarPostulaciones({
    jobs = [],
    onEditJob,
    onToggleJobStatus,
}) {
    // =====================================================
    // ESTADOS
    // =====================================================

    const [search, setSearch] = useState("");

    const [tipoFiltro, setTipoFiltro] =
        useState("Todos los tipos");

    const [estadoFiltro, setEstadoFiltro] =
        useState("Todos los estados");

    const [vacanteSeleccionada, setVacanteSeleccionada] =
        useState(null);

    // Estado local para que el cambio se refleje
    // inmediatamente en la tabla
    const [jobsLocales, setJobsLocales] =
        useState(Array.isArray(jobs) ? jobs : []);


    // =====================================================
    // SINCRONIZAR JOBS CON EL DASHBOARD
    // =====================================================

    useEffect(() => {
        if (Array.isArray(jobs)) {
            setJobsLocales(jobs);
        }
    }, [jobs]);


    // =====================================================
    // NORMALIZAR ESTADO
    // =====================================================

    const normalizarEstado = (job) => {
        let estado =
            job?.status ||
            job?.estado ||
            "Activo";

        if (estado === "Activa") {
            estado = "Activo";
        }

        if (estado === "Inactiva") {
            estado = "Inactivo";
        }

        if (estado === "Cerrado") {
            estado = "Cerrada";
        }

        if (job?.draft === true) {
            estado = "Borrador";
        }

        return estado;
    };


    // =====================================================
    // CONVERTIR JOBS
    // =====================================================

    const vacantes = Array.isArray(jobsLocales)
        ? jobsLocales.map((job, index) => {

            const estado =
                normalizarEstado(job);

            return {
                ...job,

                id:
                    job.id ??
                    `job-${index}`,

                titulo:
                    job.title ||
                    job.titulo ||
                    "Vacante sin título",

                organizacion:
                    job.org ||
                    job.organization ||
                    job.organizacion ||
                    "Organización no especificada",

                tipo:
                    job.type ||
                    job.tipo ||
                    "Empleo",

                postulantes:
                    job.applicants ??
                    job.postulantes ??
                    0,

                estado,

                fecha:
                    job.date ||
                    job.fecha ||
                    job.createdAt ||
                    "Sin fecha",

                ubicacion:
                    job.location ||
                    job.ubicacion ||
                    "No especificada",

                salario:
                    job.salary ||
                    job.salario ||
                    "No especificado",

                descripcion:
                    job.desc ||
                    job.descripcion ||
                    "",

                responsabilidades:
                    job.responsibilities ||
                    job.responsabilidades ||
                    "",

                requisitos:
                    job.requirements ||
                    job.requisitos ||
                    "",

                beneficios:
                    job.offers ||
                    job.beneficios ||
                    "",

                deadline:
                    job.deadline ||
                    job.closing ||
                    "",
            };
        })
        : [];


    // =====================================================
    // FILTRAR VACANTES
    // =====================================================

    const filtered = vacantes.filter((item) => {

        const texto = `
            ${item.titulo}
            ${item.organizacion}
            ${item.tipo}
            ${item.estado}
            ${item.ubicacion}
        `.toLowerCase();

        const coincideBusqueda =
            texto.includes(
                search.toLowerCase()
            );

        const coincideTipo =
            tipoFiltro === "Todos los tipos" ||
            item.tipo === tipoFiltro;

        const coincideEstado =
            estadoFiltro === "Todos los estados" ||
            item.estado === estadoFiltro;

        return (
            coincideBusqueda &&
            coincideTipo &&
            coincideEstado
        );
    });


    // =====================================================
    // VER VACANTE
    // =====================================================

    const handleVer = (item) => {

        setVacanteSeleccionada({
            ...item,
            estado: normalizarEstado(item),
        });
    };


    // =====================================================
    // CERRAR MODAL
    // =====================================================

    const handleCerrarVista = () => {
        setVacanteSeleccionada(null);
    };


    // =====================================================
    // EDITAR VACANTE
    // =====================================================

    const handleEditar = (item) => {

        if (!item) {
            return;
        }

        if (typeof onEditJob === "function") {
            onEditJob(item);
        }
    };


    // =====================================================
    // CAMBIAR ESTADO
    // =====================================================

    const handleCambiarEstado = (
        item,
        nuevoEstado
    ) => {

        if (!item || !nuevoEstado) {
            return;
        }

        console.log(
            "Cambiando estado:",
            item.id,
            nuevoEstado
        );


        // =================================================
        // ACTUALIZAR ESTADO LOCAL INMEDIATAMENTE
        // =================================================

        setJobsLocales((prevJobs) => {

            return prevJobs.map((job) => {

                const jobId =
                    job.id ??
                    null;

                if (
                    String(jobId) !==
                    String(item.id)
                ) {
                    return job;
                }

                return {
                    ...job,

                    status: nuevoEstado,

                    estado: nuevoEstado,

                    draft:
                        nuevoEstado === "Borrador",
                };
            });
        });


        // =================================================
        // ACTUALIZAR MODAL
        // =================================================

        if (
            vacanteSeleccionada &&
            String(vacanteSeleccionada.id) ===
            String(item.id)
        ) {

            setVacanteSeleccionada((prev) => ({
                ...prev,

                estado: nuevoEstado,

                status: nuevoEstado,

                draft:
                    nuevoEstado === "Borrador",
            }));
        }


        // =================================================
        // ACTUALIZAR DASHBOARD / APP
        // =================================================

        if (
            typeof onToggleJobStatus ===
            "function"
        ) {

            onToggleJobStatus(
                item.id,
                nuevoEstado
            );

        } else {

            console.error(
                "onToggleJobStatus no fue proporcionado a AdministrarPostulaciones"
            );
        }
    };


    // =====================================================
    // CLASE DEL ESTADO
    // =====================================================

    const obtenerClaseEstado = (
        estado
    ) => {

        const estadoNormalizado =
            String(estado || "")
                .trim()
                .toLowerCase();

        switch (estadoNormalizado) {

            case "activo":
            case "activa":
                return "active";

            case "inactivo":
            case "inactiva":
                return "inactive";

            case "cerrada":
            case "cerrado":
                return "closed";

            case "borrador":
                return "draft";

            default:
                return "inactive";
        }
    };


    // =====================================================
    // FORMATEAR FECHA
    // =====================================================

    const formatearFecha = (
        fecha
    ) => {

        if (!fecha) {
            return "Sin fecha";
        }

        if (
            typeof fecha === "string"
        ) {

            const partes =
                fecha.split("-");

            if (
                partes.length === 3
            ) {

                return `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
        }

        return fecha;
    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="administrar-postulaciones">

            {/* =================================================
                FILTROS
            ================================================= */}

            <div className="admin-postulaciones-toolbar">

                {/* BUSCADOR */}

                <input
                    type="text"
                    className="admin-postulaciones-search"
                    placeholder="Buscar vacante..."
                    value={search}
                    onChange={(e) =>
                        setSearch(
                            e.target.value
                        )
                    }
                />


                {/* TIPO */}

                <select
                    className="admin-postulaciones-select"
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

                    <option value="Tiempo completo">
                        Tiempo completo
                    </option>

                    <option value="Medio tiempo">
                        Medio tiempo
                    </option>

                    <option value="Contrato">
                        Contrato
                    </option>

                    <option value="Remoto">
                        Remoto
                    </option>

                    <option value="Voluntariado">
                        Voluntariado
                    </option>

                    <option value="Horas sociales">
                        Horas sociales
                    </option>

                    <option value="Prácticas profesionales">
                        Prácticas profesionales
                    </option>

                    <option value="Práctica Profesional">
                        Práctica Profesional
                    </option>

                </select>


                {/* ESTADO */}

                <select
                    className="admin-postulaciones-select"
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

                    <option value="Activo">
                        Activo
                    </option>

                    <option value="Inactivo">
                        Inactivo
                    </option>

                    <option value="Cerrada">
                        Cerrada
                    </option>

                    <option value="Borrador">
                        Borrador
                    </option>

                </select>

            </div>


            {/* =================================================
                TABLA
            ================================================= */}

            <div className="admin-postulaciones-table-box">

                <div className="table-responsive">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Vacante
                                </th>

                                <th>
                                    Organización
                                </th>

                                <th>
                                    Tipo
                                </th>

                                <th>
                                    Postulantes
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th>
                                    Publicación
                                </th>

                                <th>
                                    Acciones
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {filtered.length > 0 ? (

                                filtered.map(
                                    (item) => {

                                        const estadoClase =
                                            obtenerClaseEstado(
                                                item.estado
                                            );

                                        return (

                                            <tr
                                                key={
                                                    item.id
                                                }
                                            >

                                                {/* VACANTE */}

                                                <td>

                                                    <strong>
                                                        {
                                                            item.titulo
                                                        }
                                                    </strong>

                                                </td>


                                                {/* ORGANIZACIÓN */}

                                                <td>
                                                    {
                                                        item.organizacion
                                                    }
                                                </td>


                                                {/* TIPO */}

                                                <td>

                                                    <span className="admin-postulaciones-type">

                                                        {
                                                            item.tipo
                                                        }

                                                    </span>

                                                </td>


                                                {/* POSTULANTES */}

                                                <td>
                                                    {
                                                        item.postulantes
                                                    }
                                                </td>


                                                {/* ESTADO */}

                                                <td>

                                                    <div
                                                        className={`admin-postulaciones-status-control ${estadoClase}`}
                                                    >

                                                        <span
                                                            className={`admin-postulaciones-status ${estadoClase}`}
                                                        >

                                                            <span className="status-dot"></span>

                                                            {
                                                                item.estado
                                                            }

                                                        </span>


                                                        <select
                                                            className={`admin-postulaciones-status-select ${estadoClase}`}
                                                            value={
                                                                item.estado
                                                            }
                                                            onChange={(e) =>
                                                                handleCambiarEstado(
                                                                    item,
                                                                    e.target.value
                                                                )
                                                            }
                                                            aria-label={`Cambiar estado de ${item.titulo}`}
                                                        >

                                                            <option value="Activo">
                                                                Activo
                                                            </option>

                                                            <option value="Inactivo">
                                                                Inactivo
                                                            </option>

                                                            <option value="Cerrada">
                                                                Cerrada
                                                            </option>

                                                            <option value="Borrador">
                                                                Borrador
                                                            </option>

                                                        </select>

                                                    </div>

                                                </td>


                                                {/* FECHA */}

                                                <td>

                                                    {
                                                        formatearFecha(
                                                            item.fecha
                                                        )
                                                    }

                                                </td>


                                                {/* ACCIONES */}

                                                <td>

                                                    <div className="admin-postulaciones-actions">

                                                        <button
                                                            type="button"
                                                            className="admin-postulaciones-action"
                                                            onClick={() =>
                                                                handleVer(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            Ver
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="admin-postulaciones-action"
                                                            onClick={() =>
                                                                handleEditar(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            Editar
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        );
                                    }
                                )

                            ) : (

                                <tr>

                                    <td
                                        colSpan="7"
                                        className="admin-postulaciones-empty"
                                    >

                                        {jobsLocales.length === 0
                                            ? "No existen vacantes registradas."
                                            : "No se encontraron vacantes."
                                        }

                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* =================================================
                MODAL VISTA PREVIA
            ================================================= */}

            {vacanteSeleccionada && (

                <div
                    className="admin-vacante-modal-overlay"
                    onClick={
                        handleCerrarVista
                    }
                >

                    <div
                        className="admin-vacante-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* HEADER */}

                        <div className="admin-vacante-modal-header">

                            <div>

                                <span className="admin-vacante-modal-label">
                                    VISTA PREVIA
                                </span>

                                <h2>
                                    {
                                        vacanteSeleccionada.titulo
                                    }
                                </h2>

                                <p>
                                    {
                                        vacanteSeleccionada.organizacion
                                    }
                                </p>

                            </div>


                            <button
                                type="button"
                                className="admin-vacante-modal-close"
                                onClick={
                                    handleCerrarVista
                                }
                                aria-label="Cerrar vista previa"
                            >
                                ×
                            </button>

                        </div>


                        {/* INFORMACIÓN */}

                        <div className="admin-vacante-modal-info">

                            <div>

                                <span>
                                    Ubicación
                                </span>

                                <strong>
                                    {
                                        vacanteSeleccionada.ubicacion
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Tipo
                                </span>

                                <strong>
                                    {
                                        vacanteSeleccionada.tipo
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Salario
                                </span>

                                <strong>
                                    {
                                        vacanteSeleccionada.salario
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Estado
                                </span>

                                <strong
                                    className={`modal-status ${obtenerClaseEstado(
                                        vacanteSeleccionada.estado
                                    )}`}
                                >

                                    <span className="status-dot"></span>

                                    {
                                        vacanteSeleccionada.estado
                                    }

                                </strong>

                            </div>

                        </div>


                        {/* CONTENIDO */}

                        <div className="admin-vacante-modal-content">

                            {vacanteSeleccionada.descripcion && (

                                <div className="admin-vacante-modal-section">

                                    <h3>
                                        Descripción
                                    </h3>

                                    <p>
                                        {
                                            vacanteSeleccionada.descripcion
                                        }
                                    </p>

                                </div>

                            )}


                            {vacanteSeleccionada.responsabilidades && (

                                <div className="admin-vacante-modal-section">

                                    <h3>
                                        Responsabilidades
                                    </h3>

                                    <p>
                                        {
                                            Array.isArray(
                                                vacanteSeleccionada.responsabilidades
                                            )
                                                ? vacanteSeleccionada.responsabilidades.join(
                                                    ", "
                                                )
                                                : vacanteSeleccionada.responsabilidades
                                        }
                                    </p>

                                </div>

                            )}


                            {vacanteSeleccionada.requisitos && (

                                <div className="admin-vacante-modal-section">

                                    <h3>
                                        Requisitos
                                    </h3>

                                    <p>
                                        {
                                            Array.isArray(
                                                vacanteSeleccionada.requisitos
                                            )
                                                ? vacanteSeleccionada.requisitos.join(
                                                    ", "
                                                )
                                                : vacanteSeleccionada.requisitos
                                        }
                                    </p>

                                </div>

                            )}


                            {vacanteSeleccionada.beneficios && (

                                <div className="admin-vacante-modal-section">

                                    <h3>
                                        Beneficios y oferta
                                    </h3>

                                    <p>
                                        {
                                            Array.isArray(
                                                vacanteSeleccionada.beneficios
                                            )
                                                ? vacanteSeleccionada.beneficios.join(
                                                    ", "
                                                )
                                                : vacanteSeleccionada.beneficios
                                        }
                                    </p>

                                </div>

                            )}


                            {vacanteSeleccionada.deadline && (

                                <div className="admin-vacante-modal-section">

                                    <h3>
                                        Fecha límite
                                    </h3>

                                    <p>
                                        {
                                            formatearFecha(
                                                vacanteSeleccionada.deadline
                                            )
                                        }
                                    </p>

                                </div>

                            )}

                        </div>


                        {/* BOTONES */}

                        <div className="admin-vacante-modal-actions">

                            <button
                                type="button"
                                className="admin-vacante-modal-secondary"
                                onClick={
                                    handleCerrarVista
                                }
                            >
                                Cerrar
                            </button>


                            <button
                                type="button"
                                className="admin-vacante-modal-primary"
                                onClick={() => {

                                    const vacante =
                                        vacanteSeleccionada;

                                    handleCerrarVista();

                                    handleEditar(
                                        vacante
                                    );

                                }}
                            >
                                Editar vacante
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default AdministrarPostulaciones;