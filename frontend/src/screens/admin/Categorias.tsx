
import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import "../../styles/admin/categorias.css";

interface Category {
    id: number;
    nombre: string;
    descripcion: string;
    oportunidades: number;
}

interface CategoryForm {
    nombre: string;
    descripcion: string;
}

type SuccessAlertType =
    | "crear"
    | "editar"
    | "eliminar"
    | null;


function Categorias() {

    // =====================================================
    // DATOS INICIALES
    // =====================================================

    const [categorias, setCategorias] = useState<Category[]>([
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
    // ESTADOS DEL MODAL
    // =====================================================

    const [modalOpen, setModalOpen] =
        useState(false);

    const [modoModal, setModoModal] =
        useState<"crear" | "editar">("crear");

    const [categoriaSeleccionada, setCategoriaSeleccionada] =
        useState<Category | null>(null);

    const [formulario, setFormulario] =
        useState<CategoryForm>({
            nombre: "",
            descripcion: "",
        });


    // =====================================================
    // ESTADOS DE ELIMINACIÓN
    // =====================================================

    const [categoriaAEliminar, setCategoriaAEliminar] =
        useState<Category | null>(null);

    const [alertaEliminarOpen, setAlertaEliminarOpen] =
        useState(false);


    // =====================================================
    // ESTADO ALERTA DE ÉXITO
    // =====================================================

    const [successAlert, setSuccessAlert] =
        useState<SuccessAlertType>(null);

    const [successCategoryName, setSuccessCategoryName] =
        useState("");


    // =====================================================
    // CERRAR AUTOMÁTICAMENTE ALERTA DE ÉXITO
    // =====================================================

    useEffect(() => {

        if (!successAlert) {
            return;
        }

        const timer = window.setTimeout(() => {

            setSuccessAlert(null);
            setSuccessCategoryName("");

        }, 3500);

        return () => {
            window.clearTimeout(timer);
        };

    }, [successAlert]);


    // =====================================================
    // ABRIR NUEVA CATEGORÍA
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
    // ABRIR EDITAR CATEGORÍA
    // =====================================================

    const abrirEditarCategoria = (
        categoria: Category
    ) => {

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

    const actualizarCampo = (
        campo: keyof CategoryForm,
        valor: string
    ) => {

        setFormulario((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };


    // =====================================================
    // MOSTRAR ALERTA DE ÉXITO
    // =====================================================

    const mostrarAlertaExito = (
        tipo: "crear" | "editar" | "eliminar",
        nombre: string
    ) => {

        setSuccessCategoryName(nombre);

        setSuccessAlert(tipo);
    };


    // =====================================================
    // GUARDAR CATEGORÍA
    // =====================================================

    const guardarCategoria = (
        e: FormEvent<HTMLFormElement>
    ) => {

        e.preventDefault();

        const nombre =
            formulario.nombre.trim();

        const descripcion =
            formulario.descripcion.trim();


        // =================================================
        // VALIDACIÓN
        // =================================================

        if (!nombre) {
            return;
        }


        // =================================================
        // CREAR
        // =================================================

        if (modoModal === "crear") {

            const nuevaCategoria: Category = {

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


            cerrarModal();


            // Mostrar alerta de creación
            mostrarAlertaExito(
                "crear",
                nombre
            );


            return;
        }


        // =================================================
        // EDITAR
        // =================================================

        if (categoriaSeleccionada) {

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


            cerrarModal();


            // Mostrar alerta de actualización
            mostrarAlertaExito(
                "editar",
                nombre
            );
        }
    };


    // =====================================================
    // SOLICITAR ELIMINACIÓN
    // =====================================================

    const solicitarEliminarCategoria = (
        categoria: Category
    ) => {

        setCategoriaAEliminar(categoria);

        setAlertaEliminarOpen(true);
    };


    // =====================================================
    // CANCELAR ELIMINACIÓN
    // =====================================================

    const cancelarEliminarCategoria = () => {

        setAlertaEliminarOpen(false);

        setCategoriaAEliminar(null);
    };


    // =====================================================
    // CONFIRMAR ELIMINACIÓN
    // =====================================================

    const confirmarEliminarCategoria = () => {

        if (!categoriaAEliminar) {
            return;
        }


        // Guardamos el nombre antes de limpiar
        // la categoría seleccionada.

        const nombreEliminado =
            categoriaAEliminar.nombre;


        // =================================================
        // ELIMINAR DE LA LISTA
        // =================================================

        setCategorias((prev) =>
            prev.filter(
                (item) =>
                    item.id !==
                    categoriaAEliminar.id
            )
        );


        // =================================================
        // CERRAR ALERTA DE CONFIRMACIÓN
        // =================================================

        setAlertaEliminarOpen(false);

        setCategoriaAEliminar(null);


        // =================================================
        // MOSTRAR ALERTA DE ÉXITO
        // =================================================

        mostrarAlertaExito(
            "eliminar",
            nombreEliminado
        );
    };


    // =====================================================
    // CERRAR ALERTA DE ÉXITO
    // =====================================================

    const cerrarAlertaExito = () => {

        setSuccessAlert(null);

        setSuccessCategoryName("");
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

                <div>

                    <h2>
                        Categorías
                    </h2>

                    <p>
                        Administra las categorías
                        profesionales disponibles.
                    </p>

                </div>


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


                            {/* =================================================
                                ICONO
                            ================================================= */}

                            <div className="category-icon">

                                {categoria.nombre
                                    .charAt(0)
                                    .toUpperCase()}

                            </div>


                            {/* =================================================
                                CONTENIDO
                            ================================================= */}

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


                            {/* =================================================
                                ACCIONES
                            ================================================= */}

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
                                        solicitarEliminarCategoria(
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
                            onClick={abrirNuevaCategoria}
                        >
                            + Nueva categoría
                        </button>

                    </div>

                )}

            </div>


            {/* =================================================
                MODAL CREAR / EDITAR
            ================================================= */}

            {modalOpen && (

                <div
                    className="categoria-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.currentTarget ===
                            e.target
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


                            {/* =================================================
                                NOMBRE
                            ================================================= */}

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


                            {/* =================================================
                                DESCRIPCIÓN
                            ================================================= */}

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
                                    rows={4}
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


            {/* =================================================
                ALERTA DE ÉXITO
                CREAR / EDITAR / ELIMINAR
            ================================================= */}

            {successAlert && (

                <div
                    className="success-alert-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.currentTarget ===
                            e.target
                        ) {
                            cerrarAlertaExito();
                        }

                    }}
                >

                    <div
                        className="success-alert"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="success-alert-title"
                    >


                        {/* =================================================
                            ICONO
                        ================================================= */}

                        <div
                            className="success-alert-icon"
                            aria-hidden="true"
                        >
                            ✓
                        </div>


                        {/* =================================================
                            CONTENIDO
                        ================================================= */}

                        <div className="success-alert-content">

                            <h2 id="success-alert-title">

                                {successAlert === "crear"
                                    ? "¡Categoría creada!"
                                    : successAlert === "editar"
                                        ? "¡Categoría actualizada!"
                                        : "¡Categoría eliminada!"}

                            </h2>


                            <p>

                                {successAlert === "crear"
                                    ? "La nueva categoría se creó correctamente."
                                    : successAlert === "editar"
                                        ? "Los cambios de la categoría se guardaron correctamente."
                                        : "La categoría se eliminó correctamente."}

                            </p>


                            <strong>
                                "{successCategoryName}"
                            </strong>

                        </div>


                        {/* =================================================
                            CERRAR
                        ================================================= */}

                        <button
                            type="button"
                            className="success-alert-close"
                            onClick={cerrarAlertaExito}
                            aria-label="Cerrar alerta"
                        >
                            ×
                        </button>

                    </div>

                </div>

            )}


            {/* =================================================
                ALERTA DE CONFIRMACIÓN DE ELIMINACIÓN
            ================================================= */}

            {alertaEliminarOpen &&
                categoriaAEliminar && (

                    <div
                        className="delete-alert-overlay"
                        onMouseDown={(e) => {

                            if (
                                e.currentTarget ===
                                e.target
                            ) {
                                cancelarEliminarCategoria();
                            }

                        }}
                    >

                        <div
                            className="delete-alert"
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="delete-alert-title"
                        >


                            {/* =================================================
                                ICONO
                            ================================================= */}

                            <div
                                className="delete-alert-icon"
                                aria-hidden="true"
                            >
                                !
                            </div>


                            {/* =================================================
                                CONTENIDO
                            ================================================= */}

                            <div className="delete-alert-content">

                                <h2 id="delete-alert-title">
                                    ¿Eliminar categoría?
                                </h2>

                                <p>
                                    Estás a punto de eliminar
                                    la categoría:
                                </p>

                                <strong>
                                    "{categoriaAEliminar.nombre}"
                                </strong>

                                <span>
                                    Esta acción no se puede
                                    deshacer.
                                </span>

                            </div>


                            {/* =================================================
                                ACCIONES
                            ================================================= */}

                            <div className="delete-alert-actions">

                                <button
                                    type="button"
                                    className="delete-alert-cancel"
                                    onClick={
                                        cancelarEliminarCategoria
                                    }
                                >
                                    Cancelar
                                </button>


                                <button
                                    type="button"
                                    className="delete-alert-confirm"
                                    onClick={
                                        confirmarEliminarCategoria
                                    }
                                >
                                    Eliminar
                                </button>

                            </div>

                        </div>

                    </div>

                )}

        </section>
    );
}

export default Categorias;
