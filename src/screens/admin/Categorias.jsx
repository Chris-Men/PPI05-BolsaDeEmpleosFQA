import { useState } from "react";

import "../../styles/admin/categorias.css";

function Categorias() {
    // =====================================================
    // DATOS INICIALES
    // =====================================================

    const [categorias, setCategorias] = useState([
        {
            id: 1,
            nombre: "Tecnología",
            descripcion:
                "Desarrollo, informática y soporte tecnológico.",
            oportunidades: 12,
        },
        {
            id: 2,
            nombre: "Administración",
            descripcion:
                "Gestión administrativa y organizacional.",
            oportunidades: 8,
        },
        {
            id: 3,
            nombre: "Diseño",
            descripcion:
                "Diseño gráfico, audiovisual y comunicación visual.",
            oportunidades: 5,
        },
        {
            id: 4,
            nombre: "Educación",
            descripcion:
                "Docencia, formación y apoyo educativo.",
            oportunidades: 4,
        },
        {
            id: 5,
            nombre: "Trabajo Social",
            descripcion:
                "Intervención y desarrollo comunitario.",
            oportunidades: 7,
        },
    ]);

    // =====================================================
    // ESTADOS
    // =====================================================

    const [modalOpen, setModalOpen] = useState(false);

    const [modoModal, setModoModal] = useState("crear");

    const [categoriaSeleccionada, setCategoriaSeleccionada] =
        useState(null);

    const [formulario, setFormulario] = useState({
        nombre: "",
        descripcion: "",
    });

    // =====================================================
    // ABRIR MODAL NUEVA CATEGORÍA
    // =====================================================

    const abrirNuevaCategoria = () => {
        setModoModal("crear");

        setCategoriaSeleccionada(null);

        setFormulario({
            nombre: "",
            descripcion: "",
        });

        setModalOpen(true);
    };

    // =====================================================
    // ABRIR MODAL EDITAR
    // =====================================================

    const abrirEditarCategoria = (categoria) => {
        setModoModal("editar");

        setCategoriaSeleccionada(categoria);

        setFormulario({
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
        });

        setModalOpen(true);
    };

    // =====================================================
    // CERRAR MODAL
    // =====================================================

    const cerrarModal = () => {
        setModalOpen(false);

        setCategoriaSeleccionada(null);

        setFormulario({
            nombre: "",
            descripcion: "",
        });
    };

    // =====================================================
    // ACTUALIZAR FORMULARIO
    // =====================================================

    const actualizarCampo = (campo, valor) => {
        setFormulario((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };

    // =====================================================
    // GUARDAR CATEGORÍA
    // =====================================================

    const guardarCategoria = (e) => {
        e.preventDefault();

        const nombre = formulario.nombre.trim();

        const descripcion =
            formulario.descripcion.trim();

        if (!nombre) {
            return;
        }

        // =================================================
        // CREAR
        // =================================================

        if (modoModal === "crear") {
            const nuevaCategoria = {
                id: Date.now(),
                nombre,
                descripcion:
                    descripcion ||
                    "Sin descripción.",
                oportunidades: 0,
            };

            setCategorias((prev) => [
                ...prev,
                nuevaCategoria,
            ]);
        }

        // =================================================
        // EDITAR
        // =================================================

        else if (categoriaSeleccionada) {
            setCategorias((prev) =>
                prev.map((categoria) =>
                    categoria.id ===
                    categoriaSeleccionada.id
                        ? {
                              ...categoria,
                              nombre,
                              descripcion:
                                  descripcion ||
                                  "Sin descripción.",
                          }
                        : categoria
                )
            );
        }

        cerrarModal();
    };

    // =====================================================
    // ELIMINAR CATEGORÍA
    // =====================================================

    const eliminarCategoria = (categoria) => {
        const confirmar = window.confirm(
            `¿Desea eliminar la categoría "${categoria.nombre}"?`
        );

        if (!confirmar) {
            return;
        }

        setCategorias((prev) =>
            prev.filter(
                (item) =>
                    item.id !== categoria.id
            )
        );
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <section className="admin-screen categorias-screen">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="screen-header">

            

                <button
                    type="button"
                    className="primary-button"
                    onClick={abrirNuevaCategoria}
                >
                    + Nueva categoría
                </button>

            </div>

            {/* =================================================
                GRID DE CATEGORÍAS
            ================================================= */}

            <div className="category-grid">

                {categorias.length > 0 ? (

                    categorias.map((categoria) => (

                        <div
                            className="category-card"
                            key={categoria.id}
                        >

                            {/* ICONO */}

                            <div className="category-icon">
                                {categoria.nombre
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            {/* CONTENIDO */}

                            <div className="category-content">

                                <h3>
                                    {categoria.nombre}
                                </h3>

                                <p>
                                    {categoria.descripcion}
                                </p>

                                <span>
                                    {categoria.oportunidades}{" "}
                                    {categoria.oportunidades === 1
                                        ? "oportunidad"
                                        : "oportunidades"}
                                </span>

                            </div>

                            {/* ACCIONES */}

                            <div className="category-actions">

                                <button
                                    type="button"
                                    className="edit-button"
                                    onClick={() =>
                                        abrirEditarCategoria(
                                            categoria
                                        )
                                    }
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    className="delete-button"
                                    onClick={() =>
                                        eliminarCategoria(
                                            categoria
                                        )
                                    }
                                >
                                    Eliminar
                                </button>

                            </div>

                        </div>

                    ))

                ) : (

                    <div className="categories-empty">

                        <strong>
                            No hay categorías registradas.
                        </strong>

                        <span>
                            Cree una nueva categoría
                            para comenzar.
                        </span>

                        <button
                            type="button"
                            className="primary-button"
                            onClick={
                                abrirNuevaCategoria
                            }
                        >
                            + Nueva categoría
                        </button>

                    </div>

                )}

            </div>

            {/* =================================================
                MODAL
            ================================================= */}

            {modalOpen && (

                <div
                    className="categoria-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target.classList.contains(
                                "categoria-modal-overlay"
                            )
                        ) {
                            cerrarModal();
                        }

                    }}
                >

                    <div className="categoria-modal">

                        {/* =================================================
                            HEADER MODAL
                        ================================================= */}

                        <div className="categoria-modal-header">

                            <div>

                                <span>
                                    {modoModal === "crear"
                                        ? "NUEVA CATEGORÍA"
                                        : "EDITAR CATEGORÍA"}
                                </span>

                                <h2>
                                    {modoModal === "crear"
                                        ? "Crear categoría"
                                        : "Editar categoría"}
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="categoria-modal-close"
                                onClick={cerrarModal}
                                aria-label="Cerrar"
                            >
                                ×
                            </button>

                        </div>

                        {/* =================================================
                            FORMULARIO
                        ================================================= */}

                        <form
                            className="categoria-form"
                            onSubmit={guardarCategoria}
                        >

                            <div className="categoria-field">

                                <label htmlFor="categoria-nombre">
                                    Nombre de la categoría
                                </label>

                                <input
                                    id="categoria-nombre"
                                    type="text"
                                    value={
                                        formulario.nombre
                                    }
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "nombre",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ej. Tecnología"
                                    autoFocus
                                    required
                                />

                            </div>

                            <div className="categoria-field">

                                <label htmlFor="categoria-descripcion">
                                    Descripción
                                </label>

                                <textarea
                                    id="categoria-descripcion"
                                    value={
                                        formulario.descripcion
                                    }
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "descripcion",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Describe el área profesional..."
                                    rows="4"
                                />

                            </div>

                            {/* =================================================
                                ACCIONES MODAL
                            ================================================= */}

                            <div className="categoria-modal-actions">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={cerrarModal}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                >
                                    {modoModal === "crear"
                                        ? "Crear categoría"
                                        : "Guardar cambios"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </section>
    );
}

export default Categorias;