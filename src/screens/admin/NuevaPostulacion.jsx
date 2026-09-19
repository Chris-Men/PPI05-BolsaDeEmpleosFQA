import { useState } from "react";

import "../../styles/admin/nuevapostulacion.css";

function NuevaPostulacion({
    newJobForm = {},
    setNewJobForm,
    onPublish,
    onSaveDraft,
    onBack,
}) {
    const [showPreview, setShowPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState(null);

    // =====================================================
    // ALERTA
    // =====================================================

    const [alerta, setAlerta] = useState({
        visible: false,
        tipo: "",
        titulo: "",
        mensaje: "",
    });

    const mostrarAlerta = (tipo, titulo, mensaje) => {
        setAlerta({
            visible: true,
            tipo,
            titulo,
            mensaje,
        });
    };

    const cerrarAlerta = () => {
        setAlerta({
            visible: false,
            tipo: "",
            titulo: "",
            mensaje: "",
        });
    };

    // =====================================================
    // FORMULARIO VACÍO
    // =====================================================

    const formularioInicial = {
        title: "",
        org: "",
        location: "",
        area: "Educación",
        type: "Tiempo completo",
        salary: "",
        deadline: "",
        desc: "",
        responsibilities: "",
        requirements: "",
        offers: "",
    };

    // =====================================================
    // ACTUALIZAR CAMPOS
    // =====================================================

    const updateField = (field, value) => {
        if (typeof setNewJobForm !== "function") {
            console.error(
                "NuevaPostulacion: setNewJobForm no fue proporcionado."
            );
            return;
        }

        setNewJobForm((prev) => ({
            ...(prev || {}),
            [field]: value,
        }));
    };

    // =====================================================
    // LIMPIAR FORMULARIO
    // =====================================================

    const limpiarFormulario = () => {
        if (typeof setNewJobForm !== "function") {
            return;
        }

        setNewJobForm({
            ...formularioInicial,
        });
    };

    // =====================================================
    // VALIDAR FORMULARIO
    // =====================================================

    const validateForm = () => {
        if (!newJobForm.title?.trim()) {
            mostrarAlerta(
                "error",
                "Falta información",
                "No se puede continuar porque no has ingresado el título de la vacante."
            );
            return false;
        }

        if (!newJobForm.org?.trim()) {
            mostrarAlerta(
                "error",
                "Falta información",
                "No se puede continuar porque no has ingresado la organización responsable de la vacante."
            );
            return false;
        }

        if (!newJobForm.location?.trim()) {
            mostrarAlerta(
                "error",
                "Falta información",
                "No se puede continuar porque no has ingresado la ubicación de la vacante."
            );
            return false;
        }

        if (!newJobForm.deadline) {
            mostrarAlerta(
                "error",
                "Falta información",
                "No se puede continuar porque debes indicar la fecha límite de aplicación."
            );
            return false;
        }

        if (!newJobForm.desc?.trim()) {
            mostrarAlerta(
                "error",
                "Falta información",
                "No se puede continuar porque debes agregar una descripción de la vacante."
            );
            return false;
        }

        return true;
    };

    // =====================================================
    // VISTA PREVIA PARA PUBLICAR
    // =====================================================

    const handlePreviewPublish = (event) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        setPreviewMode("publish");
        setShowPreview(true);
    };

    // =====================================================
    // VISTA PREVIA PARA BORRADOR
    // =====================================================

    const handlePreviewDraft = () => {
        if (!newJobForm.title?.trim()) {
            mostrarAlerta(
                "error",
                "No se puede guardar",
                "Debes ingresar al menos el título de la vacante para poder guardar el borrador."
            );
            return;
        }

        setPreviewMode("draft");
        setShowPreview(true);
    };

    // =====================================================
    // VOLVER A EDITAR
    // =====================================================

    const handleEdit = () => {
        setShowPreview(false);
        setPreviewMode(null);
    };

    // =====================================================
    // INTERPRETAR RESPUESTA
    // =====================================================

    const obtenerRespuesta = (resultado) => {
        if (resultado === false) {
            return {
                success: false,
                message:
                    "El sistema no pudo completar la operación. Verifica la información de la vacante e inténtalo nuevamente.",
            };
        }

        if (resultado && typeof resultado === "object") {
            return {
                success:
                    resultado.success !== undefined
                        ? resultado.success
                        : true,

                message:
                    resultado.message ||
                    "La operación se completó correctamente.",
            };
        }

        return {
            success: true,
            message: "La operación se completó correctamente.",
        };
    };

    // =====================================================
    // CONFIRMAR PUBLICACIÓN
    // =====================================================

    const handleConfirmPublish = async () => {
        if (typeof onPublish !== "function") {
            mostrarAlerta(
                "error",
                "No se pudo publicar",
                "La función encargada de publicar la vacante no está disponible. Verifica la configuración del módulo administrativo."
            );
            return;
        }

        try {
            const resultado = await onPublish();

            const respuesta = obtenerRespuesta(resultado);

            if (!respuesta.success) {
                mostrarAlerta(
                    "error",
                    "No se pudo publicar la vacante",
                    respuesta.message
                );
                return;
            }

            // Cerrar vista previa
            setShowPreview(false);
            setPreviewMode(null);

            // Limpiar formulario
            limpiarFormulario();

            // Mostrar confirmación
            mostrarAlerta(
                "success",
                "¡Vacante publicada correctamente!",
                respuesta.message ||
                    "La vacante fue publicada correctamente. El formulario ha sido limpiado y está listo para registrar una nueva vacante."
            );
        } catch (error) {
            console.error(
                "Error al publicar la vacante:",
                error
            );

            const mensajeError =
                error?.message ||
                error?.response?.data?.message ||
                "El sistema encontró un problema al intentar publicar la vacante. Verifica los datos e inténtalo nuevamente.";

            mostrarAlerta(
                "error",
                "Error al publicar la vacante",
                mensajeError
            );
        }
    };

    // =====================================================
    // CONFIRMAR BORRADOR
    // =====================================================

    const handleConfirmDraft = async () => {
        if (typeof onSaveDraft !== "function") {
            mostrarAlerta(
                "error",
                "No se pudo guardar el borrador",
                "La función encargada de guardar el borrador no está disponible. Verifica la configuración del módulo administrativo."
            );
            return;
        }

        try {
            const resultado = await onSaveDraft();

            const respuesta = obtenerRespuesta(resultado);

            if (!respuesta.success) {
                mostrarAlerta(
                    "error",
                    "No se pudo guardar el borrador",
                    respuesta.message
                );
                return;
            }

            // Cerrar vista previa
            setShowPreview(false);
            setPreviewMode(null);

            // Limpiar formulario
            limpiarFormulario();

            // Mostrar confirmación
            mostrarAlerta(
                "success",
                "¡Borrador guardado correctamente!",
                respuesta.message ||
                    "El borrador fue guardado correctamente. El formulario ha sido limpiado y está listo para registrar una nueva vacante."
            );
        } catch (error) {
            console.error(
                "Error al guardar el borrador:",
                error
            );

            const mensajeError =
                error?.message ||
                error?.response?.data?.message ||
                "El sistema encontró un problema al intentar guardar el borrador. Verifica los datos e inténtalo nuevamente.";

            mostrarAlerta(
                "error",
                "Error al guardar el borrador",
                mensajeError
            );
        }
    };

    // =====================================================
    // VISTA PREVIA
    // =====================================================

    if (showPreview) {
        return (
            <>
                <VistaPreviaVacante
                    newJobForm={newJobForm}
                    mode={previewMode}
                    onEdit={handleEdit}
                    onConfirmPublish={handleConfirmPublish}
                    onConfirmDraft={handleConfirmDraft}
                    onBack={onBack}
                />

                <AlertaPersonalizada
                    alerta={alerta}
                    onClose={cerrarAlerta}
                />
            </>
        );
    }

    // =====================================================
    // FORMULARIO
    // =====================================================

    return (
        <>
            <main className="nv-screen">

                <form
                    className="nv-form"
                    onSubmit={handlePreviewPublish}
                >

                    {/* =================================================
                        INFORMACIÓN GENERAL
                    ================================================= */}

                    <section className="nv-section">

                        <div className="nv-section-title">
                            <h3>Información general</h3>

                            <span>
                                Información principal de la oportunidad.
                            </span>
                        </div>

                        <div className="nv-grid">

                            {/* TÍTULO */}

                            <div className="nv-field nv-full">
                                <label htmlFor="nv-title">
                                    Título de la vacante
                                </label>

                                <input
                                    id="nv-title"
                                    type="text"
                                    value={newJobForm.title || ""}
                                    onChange={(event) =>
                                        updateField(
                                            "title",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Coordinador de Programas"
                                    required
                                />
                            </div>

                            {/* ORGANIZACIÓN */}

                            <div className="nv-field">
                                <label htmlFor="nv-org">
                                    Organización
                                </label>

                                <input
                                    id="nv-org"
                                    type="text"
                                    value={newJobForm.org || ""}
                                    onChange={(event) =>
                                        updateField(
                                            "org",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Fundación FQA"
                                    required
                                />
                            </div>

                            {/* UBICACIÓN */}

                            <div className="nv-field">
                                <label htmlFor="nv-location">
                                    Ubicación
                                </label>

                                <input
                                    id="nv-location"
                                    type="text"
                                    value={newJobForm.location || ""}
                                    onChange={(event) =>
                                        updateField(
                                            "location",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. San Salvador"
                                    required
                                />
                            </div>

                            {/* ÁREA */}

                            <div className="nv-field">
                                <label htmlFor="nv-area">
                                    Área de impacto
                                </label>

                                <select
                                    id="nv-area"
                                    value={
                                        newJobForm.area ||
                                        "Educación"
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "area",
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="Educación">
                                        Educación
                                    </option>

                                    <option value="Desarrollo y Bienestar Social">
                                        Desarrollo y Bienestar Social
                                    </option>

                                    <option value="Medioambiente y Sostenibilidad">
                                        Medioambiente y Sostenibilidad
                                    </option>

                                    <option value="Autonomía Económica">
                                        Autonomía Económica
                                    </option>

                                    <option value="Salud y Bienestar">
                                        Salud y Bienestar
                                    </option>
                                </select>
                            </div>

                            {/* TIPO */}

                            <div className="nv-field">
                                <label htmlFor="nv-type">
                                    Tipo de jornada
                                </label>

                                <select
                                    id="nv-type"
                                    value={
                                        newJobForm.type ||
                                        "Tiempo completo"
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "type",
                                            event.target.value
                                        )
                                    }
                                >
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
                                </select>
                            </div>

                            {/* SALARIO */}

                            <div className="nv-field">
                                <label htmlFor="nv-salary">
                                    Salario / remuneración
                                </label>

                                <input
                                    id="nv-salary"
                                    type="text"
                                    value={newJobForm.salary || ""}
                                    onChange={(event) => {
                                        let value =
                                            event.target.value;

                                        if (
                                            value &&
                                            !value.startsWith("$") &&
                                            /^\d/.test(value)
                                        ) {
                                            value = "$" + value;
                                        }

                                        updateField(
                                            "salary",
                                            value
                                        );
                                    }}
                                    placeholder="Ej. $600-$800/mes"
                                    pattern="(\$?[0-9]+.*)"
                                    title="Ingresa un salario que comience con un número, por ejemplo: $600 o $600-$800/mes."
                                    required
                                />
                            </div>

                            {/* FECHA LÍMITE */}

                            <div className="nv-field">
                                <label htmlFor="nv-deadline">
                                    Fecha límite de aplicación
                                </label>

                                <input
                                    id="nv-deadline"
                                    type="date"
                                    value={
                                        newJobForm.deadline || ""
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "deadline",
                                            event.target.value
                                        )
                                    }
                                    min={
                                        new Date()
                                            .toISOString()
                                            .split("T")[0]
                                    }
                                    required
                                />

                                <small>
                                    Después de esta fecha ya no se
                                    podrán recibir postulaciones.
                                </small>
                            </div>

                        </div>
                    </section>

                    {/* =================================================
                        DESCRIPCIÓN
                    ================================================= */}

                    <section className="nv-section">

                        <div className="nv-section-title">
                            <h3>
                                Descripción de la vacante
                            </h3>

                            <span>
                                Describe claramente la oportunidad.
                            </span>
                        </div>

                        <div className="nv-grid">

                            <div className="nv-field nv-full">

                                <label htmlFor="nv-desc">
                                    Descripción
                                </label>

                                <textarea
                                    id="nv-desc"
                                    value={
                                        newJobForm.desc || ""
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "desc",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Describe la finalidad de la posición..."
                                    required
                                />

                            </div>

                        </div>

                    </section>

                    {/* =================================================
                        RESPONSABILIDADES
                    ================================================= */}

                    <section className="nv-section">

                        <div className="nv-section-title">
                            <h3>
                                Responsabilidades
                            </h3>

                            <span>
                                Separa cada responsabilidad mediante una coma.
                            </span>
                        </div>

                        <div className="nv-grid">

                            <div className="nv-field nv-full">

                                <label htmlFor="nv-responsibilities">
                                    Responsabilidades principales
                                </label>

                                <textarea
                                    id="nv-responsibilities"
                                    value={
                                        newJobForm.responsibilities || ""
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "responsibilities",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Coordinar proyectos, elaborar informes, supervisar personal"
                                    required
                                />

                            </div>

                        </div>

                    </section>

                    {/* =================================================
                        REQUISITOS
                    ================================================= */}

                    <section className="nv-section">

                        <div className="nv-section-title">
                            <h3>
                                Requisitos
                            </h3>

                            <span>
                                Define las condiciones necesarias para aplicar.
                            </span>
                        </div>

                        <div className="nv-grid">

                            <div className="nv-field nv-full">

                                <label htmlFor="nv-requirements">
                                    Requisitos mínimos
                                </label>

                                <textarea
                                    id="nv-requirements"
                                    value={
                                        newJobForm.requirements || ""
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "requirements",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Licenciatura, 2 años de experiencia, disponibilidad de campo"
                                    required
                                />

                            </div>

                        </div>

                    </section>

                    {/* =================================================
                        BENEFICIOS
                    ================================================= */}

                    <section className="nv-section">

                        <div className="nv-section-title">
                            <h3>
                                Beneficios y oferta
                            </h3>

                            <span>
                                Información adicional que ofrece la organización.
                            </span>
                        </div>

                        <div className="nv-grid">

                            <div className="nv-field nv-full">

                                <label htmlFor="nv-offers">
                                    Beneficios / ofertas
                                </label>

                                <textarea
                                    id="nv-offers"
                                    value={
                                        newJobForm.offers || ""
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "offers",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Prestaciones de ley, capacitaciones, viáticos"
                                />

                            </div>

                        </div>

                    </section>

                    {/* =================================================
                        ACCIONES
                    ================================================= */}

                    <div className="nv-actions">

                        <button
                            type="button"
                            className="nv-button nv-button-secondary"
                            onClick={onBack}
                        >
                            ← Regresar
                        </button>

                        <button
                            type="button"
                            className="nv-button nv-button-secondary"
                            onClick={handlePreviewDraft}
                        >
                            Guardar borrador
                        </button>

                        <button
                            type="submit"
                            className="nv-button nv-button-primary"
                        >
                            Vista previa y publicar
                        </button>

                    </div>

                </form>

            </main>

            <AlertaPersonalizada
                alerta={alerta}
                onClose={cerrarAlerta}
            />
        </>
    );
}


// =====================================================
// ALERTA PERSONALIZADA
// =====================================================

function AlertaPersonalizada({ alerta, onClose }) {
    if (!alerta.visible) {
        return null;
    }

    const esExito = alerta.tipo === "success";

    return (
        <div className="admin-alert-overlay">

            <div
                className={`admin-alert-box ${
                    esExito
                        ? "admin-alert-success"
                        : "admin-alert-error"
                }`}
            >

                <button
                    type="button"
                    className="admin-alert-close"
                    onClick={onClose}
                    aria-label="Cerrar alerta"
                >
                    ×
                </button>

                <div className="admin-alert-icon">
                    {esExito ? "✓" : "!"}
                </div>

                <div className="admin-alert-content">

                    <h3>
                        {alerta.titulo}
                    </h3>

                    <p>
                        {alerta.mensaje}
                    </p>

                </div>

                <button
                    type="button"
                    className="admin-alert-button"
                    onClick={onClose}
                >
                    Entendido
                </button>

            </div>

        </div>
    );
}


// =====================================================
// VISTA PREVIA
// =====================================================

function VistaPreviaVacante({
    newJobForm = {},
    mode,
    onEdit,
    onConfirmPublish,
    onConfirmDraft,
    onBack,
}) {
    return (
        <main className="nv-screen">

            <header className="nv-header">

                <div>
                    <h2>
                        Vista previa de la vacante
                    </h2>

                    <p>
                        Revisa la información antes de continuar.
                    </p>
                </div>

            </header>

            <section className="nv-section">

                <div className="nv-section-title">

                    <h3>
                        {newJobForm.title ||
                            "Sin título"}
                    </h3>

                    <span>
                        {newJobForm.org ||
                            "Sin organización"}
                    </span>

                </div>

                <div className="nv-grid">

                    <div className="nv-field">
                        <label>
                            Ubicación
                        </label>

                        <div>
                            {newJobForm.location ||
                                "No especificada"}
                        </div>
                    </div>

                    <div className="nv-field">
                        <label>
                            Área
                        </label>

                        <div>
                            {newJobForm.area ||
                                "No especificada"}
                        </div>
                    </div>

                    <div className="nv-field">
                        <label>
                            Tipo de jornada
                        </label>

                        <div>
                            {newJobForm.type ||
                                "No especificado"}
                        </div>
                    </div>

                    <div className="nv-field">
                        <label>
                            Salario / remuneración
                        </label>

                        <div>
                            {newJobForm.salary ||
                                "No especificado"}
                        </div>
                    </div>

                    <div className="nv-field">
                        <label>
                            Fecha límite
                        </label>

                        <div>
                            {newJobForm.deadline ||
                                "No especificada"}
                        </div>
                    </div>

                    <div className="nv-field nv-full">

                        <label>
                            Descripción
                        </label>

                        <div>
                            {newJobForm.desc ||
                                "Sin descripción"}
                        </div>

                    </div>

                    <div className="nv-field nv-full">

                        <label>
                            Responsabilidades
                        </label>

                        <div>
                            {newJobForm.responsibilities ||
                                "No especificadas"}
                        </div>

                    </div>

                    <div className="nv-field nv-full">

                        <label>
                            Requisitos
                        </label>

                        <div>
                            {newJobForm.requirements ||
                                "No especificados"}
                        </div>

                    </div>

                    <div className="nv-field nv-full">

                        <label>
                            Beneficios / ofertas
                        </label>

                        <div>
                            {newJobForm.offers ||
                                "No especificados"}
                        </div>

                    </div>

                </div>

            </section>

            <div className="nv-actions">

                <button
                    type="button"
                    className="nv-button nv-button-secondary"
                    onClick={onBack}
                >
                    ← Regresar
                </button>

                <button
                    type="button"
                    className="nv-button nv-button-secondary"
                    onClick={onEdit}
                >
                    ← Editar
                </button>

                {mode === "draft" ? (

                    <button
                        type="button"
                        className="nv-button nv-button-primary"
                        onClick={onConfirmDraft}
                    >
                        Guardar borrador
                    </button>

                ) : (

                    <button
                        type="button"
                        className="nv-button nv-button-primary"
                        onClick={onConfirmPublish}
                    >
                        Confirmar publicación
                    </button>

                )}

            </div>

        </main>
    );
}

export default NuevaPostulacion;