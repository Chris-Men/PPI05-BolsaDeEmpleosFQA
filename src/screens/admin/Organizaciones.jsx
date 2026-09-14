import { useState } from "react";

import "../../styles/admin/organizaciones.css";

function Organizaciones({
    search = "",
}) {
    // =====================================================
    // ESTADOS
    // =====================================================

    const [organizaciones, setOrganizaciones] = useState([
        {
            id: 1,
            nombre: "Fundación Quintanilla Amaya",
            contacto: "administracion@fqa.org",
            oportunidades: 8,
            estado: "Activa",
        },
        {
            id: 2,
            nombre: "Universidad Luterana Salvadoreña",
            contacto: "contacto@uls.edu.sv",
            oportunidades: 5,
            estado: "Activa",
        },
        {
            id: 3,
            nombre: "Organización Social",
            contacto: "contacto@organizacion.org",
            oportunidades: 2,
            estado: "Pendiente",
        },
    ]);

    const [busquedaLocal, setBusquedaLocal] = useState("");

    const [estadoFiltro, setEstadoFiltro] = useState(
        "Todos los estados"
    );

    const [modal, setModal] = useState(null);

    const [organizacionSeleccionada, setOrganizacionSeleccionada] =
        useState(null);

    const [form, setForm] = useState({
        nombre: "",
        contacto: "",
        oportunidades: 0,
        estado: "Activa",
    });

    // =====================================================
    // BÚSQUEDA
    // =====================================================

    const textoBusqueda =
        busquedaLocal || search || "";

    const filtered = organizaciones.filter((item) => {
        const texto = `
            ${item.nombre}
            ${item.contacto}
            ${item.estado}
        `.toLowerCase();

        const coincideBusqueda = texto.includes(
            textoBusqueda.toLowerCase()
        );

        const coincideEstado =
            estadoFiltro === "Todos los estados" ||
            item.estado === estadoFiltro;

        return (
            coincideBusqueda &&
            coincideEstado
        );
    });

    // =====================================================
    // NUEVA ORGANIZACIÓN
    // =====================================================

    const abrirNuevaOrganizacion = () => {
        setForm({
            nombre: "",
            contacto: "",
            oportunidades: 0,
            estado: "Activa",
        });

        setOrganizacionSeleccionada(null);

        setModal("nueva");
    };

    // =====================================================
    // VER ORGANIZACIÓN
    // =====================================================

    const handleVer = (organizacion) => {
        setOrganizacionSeleccionada(organizacion);
        setModal("ver");
    };

    // =====================================================
    // EDITAR ORGANIZACIÓN
    // =====================================================

    const handleEditar = (organizacion) => {
        setOrganizacionSeleccionada(organizacion);

        setForm({
            nombre: organizacion.nombre,
            contacto: organizacion.contacto,
            oportunidades: organizacion.oportunidades,
            estado: organizacion.estado,
        });

        setModal("editar");
    };

    // =====================================================
    // ACTUALIZAR FORMULARIO
    // =====================================================

    const updateField = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // =====================================================
    // GUARDAR ORGANIZACIÓN
    // =====================================================

    const handleGuardar = (e) => {
        e.preventDefault();

        if (!form.nombre.trim()) {
            return;
        }

        if (!form.contacto.trim()) {
            return;
        }

        // =================================================
        // EDITAR ORGANIZACIÓN
        // =================================================

        if (
            modal === "editar" &&
            organizacionSeleccionada
        ) {
            setOrganizaciones((prev) =>
                prev.map((item) =>
                    item.id ===
                    organizacionSeleccionada.id
                        ? {
                              ...item,
                              nombre:
                                  form.nombre.trim(),
                              contacto:
                                  form.contacto.trim(),
                              oportunidades:
                                  Number(
                                      form.oportunidades
                                  ) || 0,
                              estado:
                                  form.estado,
                          }
                        : item
                )
            );
        }

        // =================================================
        // NUEVA ORGANIZACIÓN
        // =================================================

        else {
            const nuevaOrganizacion = {
                id: Date.now(),
                nombre: form.nombre.trim(),
                contacto: form.contacto.trim(),
                oportunidades:
                    Number(form.oportunidades) || 0,
                estado: form.estado,
            };

            setOrganizaciones((prev) => [
                ...prev,
                nuevaOrganizacion,
            ]);
        }

        cerrarModal();
    };

    // =====================================================
    // CERRAR MODAL
    // =====================================================

    const cerrarModal = () => {
        setModal(null);
        setOrganizacionSeleccionada(null);
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <section className="organizaciones-screen">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="screen-header">


                <button
                    type="button"
                    className="primary-button"
                    onClick={
                        abrirNuevaOrganizacion
                    }
                >
                    + Nueva organización
                </button>

            </div>

            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="admin-toolbar">

                {/* BUSCADOR */}

                <input
                    type="text"
                    placeholder="Buscar organización..."
                    value={busquedaLocal}
                    onChange={(e) =>
                        setBusquedaLocal(
                            e.target.value
                        )
                    }
                />

                {/* FILTRO ESTADO */}

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

                    <option value="Activa">
                        Activa
                    </option>

                    <option value="Pendiente">
                        Pendiente
                    </option>
                </select>

            </div>

            {/* =================================================
                TABLA
            ================================================= */}

            <div className="admin-table-box">

                <table>

                    <thead>
                        <tr>

                            <th>
                                Organización
                            </th>

                            <th>
                                Contacto
                            </th>

                            <th>
                                Oportunidades
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

                            filtered.map((item) => (

                                <tr
                                    key={item.id}
                                >

                                    <td>
                                        <strong>
                                            {item.nombre}
                                        </strong>
                                    </td>

                                    <td>
                                        {item.contacto}
                                    </td>

                                    <td>
                                        {item.oportunidades}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                `status ${
                                                    item.estado ===
                                                    "Activa"
                                                        ? "status-active"
                                                        : "status-pending"
                                                }`
                                            }
                                        >
                                            {item.estado}
                                        </span>

                                    </td>

                                    <td>

                                        <div className="table-actions">

                                            <button
                                                type="button"
                                                className="edit-button"
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
                                                className="edit-button"
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

                            ))

                        ) : (

                            <tr>

                                <td
                                    colSpan="5"
                                    className="organizaciones-empty"
                                >
                                    No se encontraron
                                    organizaciones.
                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>

            {/* =================================================
                MODAL
            ================================================= */}

            {modal && (

                <div
                    className="organizaciones-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target.classList.contains(
                                "organizaciones-modal-overlay"
                            )
                        ) {
                            cerrarModal();
                        }

                    }}
                >

                    <div className="organizaciones-modal">

                        {/* =================================================
                            MODAL VER
                        ================================================= */}

                        {modal === "ver" &&
                            organizacionSeleccionada && (

                                <>

                                    <div className="organizaciones-modal-header">

                                        <div>

                                            <span>
                                                ORGANIZACIÓN
                                            </span>

                                            <h2>
                                                {
                                                    organizacionSeleccionada.nombre
                                                }
                                            </h2>

                                        </div>

                                        <button
                                            type="button"
                                            className="organizaciones-modal-close"
                                            onClick={
                                                cerrarModal
                                            }
                                        >
                                            ×
                                        </button>

                                    </div>

                                    <div className="organizaciones-modal-body">

                                        <div className="organizaciones-detail">

                                            <span>
                                                Contacto
                                            </span>

                                            <strong>
                                                {
                                                    organizacionSeleccionada.contacto
                                                }
                                            </strong>

                                        </div>

                                        <div className="organizaciones-detail">

                                            <span>
                                                Oportunidades
                                            </span>

                                            <strong>
                                                {
                                                    organizacionSeleccionada.oportunidades
                                                }
                                            </strong>

                                        </div>

                                        <div className="organizaciones-detail">

                                            <span>
                                                Estado
                                            </span>

                                            <strong>
                                                {
                                                    organizacionSeleccionada.estado
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                    <div className="organizaciones-modal-footer">

                                        <button
                                            type="button"
                                            className="modal-secondary-button"
                                            onClick={
                                                cerrarModal
                                            }
                                        >
                                            Cerrar
                                        </button>

                                        <button
                                            type="button"
                                            className="modal-primary-button"
                                            onClick={() =>
                                                handleEditar(
                                                    organizacionSeleccionada
                                                )
                                            }
                                        >
                                            Editar
                                        </button>

                                    </div>

                                </>

                            )}

                        {/* =================================================
                            MODAL NUEVA / EDITAR
                        ================================================= */}

                        {(modal === "nueva" ||
                            modal === "editar") && (

                            <form
                                onSubmit={
                                    handleGuardar
                                }
                            >

                                <div className="organizaciones-modal-header">

                                    <div>

                                        <span>
                                            {
                                                modal ===
                                                "nueva"
                                                    ? "NUEVA ORGANIZACIÓN"
                                                    : "EDITAR ORGANIZACIÓN"
                                            }
                                        </span>

                                        <h2>
                                            {
                                                modal ===
                                                "nueva"
                                                    ? "Registrar organización"
                                                    : "Modificar organización"
                                            }
                                        </h2>

                                    </div>

                                    <button
                                        type="button"
                                        className="organizaciones-modal-close"
                                        onClick={
                                            cerrarModal
                                        }
                                    >
                                        ×
                                    </button>

                                </div>

                                <div className="organizaciones-modal-body">

                                    <div className="organizaciones-form-field">

                                        <label>
                                            Nombre de la organización
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                form.nombre
                                            }
                                            onChange={(e) =>
                                                updateField(
                                                    "nombre",
                                                    e.target.value
                                                )
                                            }
                                            required
                                        />

                                    </div>

                                    <div className="organizaciones-form-field">

                                        <label>
                                            Correo de contacto
                                        </label>

                                        <input
                                            type="email"
                                            value={
                                                form.contacto
                                            }
                                            onChange={(e) =>
                                                updateField(
                                                    "contacto",
                                                    e.target.value
                                                )
                                            }
                                            required
                                        />

                                    </div>

                                    <div className="organizaciones-form-grid">

                                        <div className="organizaciones-form-field">

                                            <label>
                                                Oportunidades
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                value={
                                                    form.oportunidades
                                                }
                                                onChange={(e) =>
                                                    updateField(
                                                        "oportunidades",
                                                        e.target.value
                                                    )
                                                }
                                            />

                                        </div>

                                        <div className="organizaciones-form-field">

                                            <label>
                                                Estado
                                            </label>

                                            <select
                                                value={
                                                    form.estado
                                                }
                                                onChange={(e) =>
                                                    updateField(
                                                        "estado",
                                                        e.target.value
                                                    )
                                                }
                                            >

                                                <option value="Activa">
                                                    Activa
                                                </option>

                                                <option value="Pendiente">
                                                    Pendiente
                                                </option>

                                            </select>

                                        </div>

                                    </div>

                                </div>

                                <div className="organizaciones-modal-footer">

                                    <button
                                        type="button"
                                        className="modal-secondary-button"
                                        onClick={
                                            cerrarModal
                                        }
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="modal-primary-button"
                                    >
                                        {
                                            modal ===
                                            "nueva"
                                                ? "Guardar organización"
                                                : "Guardar cambios"
                                        }
                                    </button>

                                </div>

                            </form>

                        )}

                    </div>

                </div>

            )}

        </section>
    );
}

export default Organizaciones;