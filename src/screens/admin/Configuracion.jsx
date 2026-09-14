import { useState } from "react";

import "../../styles/admin/configuracion.css";

// =====================================================
// CONFIGURACIÓN INICIAL
// =====================================================

export const configuracionInicial = {

    plataforma: {
        nombre: "FQA Empleos",
        fundacion: "Fundación Quintanilla Amaya",
        descripcion:
            "Portal de oportunidades laborales, horas sociales y prácticas profesionales.",
        lema: "",
    },

    contacto: {
        correo: "admin@fundaqa.org",
        telefono: "",
        whatsapp: "",
        direccion: "San Salvador, El Salvador",
    },

    inicio: {
        titulo:
            "Encuentra oportunidades que transforman vidas",
        subtitulo: "",
        descripcion: "",
    },

    institucional: {
        mision: "",
        vision: "",
        descripcion: "",
    },

    redes: {
        facebook: "",
        instagram: "",
        linkedin: "",
        youtube: "",
    },

    publicaciones: {
        revisionAdministrativa: true,
        notificaciones: true,
        permitirPostulaciones: true,
    },

};

// =====================================================
// NORMALIZAR CONFIGURACIÓN
// =====================================================

const normalizarConfiguracion = (configuracion) => {

    const base = configuracion || {};

    return {

        plataforma: {
            ...configuracionInicial.plataforma,
            ...(base.plataforma || {}),
        },

        contacto: {
            ...configuracionInicial.contacto,
            ...(base.contacto || {}),
        },

        inicio: {
            ...configuracionInicial.inicio,
            ...(base.inicio || {}),
        },

        institucional: {
            ...configuracionInicial.institucional,
            ...(base.institucional || {}),
        },

        redes: {
            ...configuracionInicial.redes,
            ...(base.redes || {}),
        },

        publicaciones: {
            ...configuracionInicial.publicaciones,
            ...(base.publicaciones || {}),
        },

    };

};

// =====================================================
// COMPONENTE
// =====================================================

function Configuracion({
    configuration,
    setConfiguration,
    resetConfiguration,
}) {

    const [saved, setSaved] = useState(false);

    // =================================================
    // CONFIGURACIÓN SEGURA
    // =================================================

    const configuracion =
        normalizarConfiguracion(configuration);

    // =================================================
    // ACTUALIZAR CAMPO
    // =================================================

    const updateField = (
        section,
        field,
        value
    ) => {

        setConfiguration((previous) => {

            const actual =
                normalizarConfiguracion(previous);

            return {

                ...actual,

                [section]: {

                    ...actual[section],

                    [field]: value,

                },

            };

        });

        setSaved(false);
    };

    // =================================================
    // GUARDAR CONFIGURACIÓN
    // =================================================

    const handleSave = (event) => {

        event.preventDefault();

        const actual =
            normalizarConfiguracion(
                configuration
            );

        setConfiguration(actual);

        try {

            localStorage.setItem(
                "fqa_empleos_configuracion",
                JSON.stringify(actual)
            );

        } catch (error) {

            console.error(
                "Error al guardar configuración:",
                error
            );

        }

        setSaved(true);

        setTimeout(() => {
            setSaved(false);
        }, 3000);
    };

    // =================================================
    // RESTAURAR CONFIGURACIÓN
    // =================================================

    const handleReset = () => {

        const confirmar =
            window.confirm(
                "¿Desea restaurar toda la configuración a sus valores predeterminados?"
            );

        if (!confirmar) {
            return;
        }

        const restaurada =
            normalizarConfiguracion(
                configuracionInicial
            );

        setConfiguration(restaurada);

        try {

            localStorage.setItem(
                "fqa_empleos_configuracion",
                JSON.stringify(restaurada)
            );

        } catch (error) {

            console.error(
                "Error al restaurar configuración:",
                error
            );

        }

        if (resetConfiguration) {

            try {

                resetConfiguration();

            } catch (error) {

                console.error(
                    "Error al ejecutar resetConfiguration:",
                    error
                );

            }

        }

        setSaved(true);

        setTimeout(() => {
            setSaved(false);
        }, 3000);
    };

    // =================================================
    // RENDER
    // =================================================

    return (

        <section className="admin-screen configuracion-screen">

            {/* =================================================
                HEADER
            ================================================= */}

            

            {/* =================================================
                FORMULARIO
            ================================================= */}

            <form
                className="settings-grid"
                onSubmit={handleSave}
            >

                {/* =================================================
                    PLATAFORMA
                ================================================= */}

                <div className="settings-card">

                    <div className="form-section-title">

                        <h3>
                            Información de la plataforma
                        </h3>

                        <span>
                            Identidad general de FQA Empleos
                        </span>

                    </div>

                    <div className="form-group">

                        <label>
                            Nombre de la plataforma
                        </label>

                        <input
                            type="text"
                            value={
                                configuracion.plataforma.nombre
                            }
                            onChange={(event) =>
                                updateField(
                                    "plataforma",
                                    "nombre",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Nombre de la fundación
                        </label>

                        <input
                            type="text"
                            value={
                                configuracion.plataforma.fundacion
                            }
                            onChange={(event) =>
                                updateField(
                                    "plataforma",
                                    "fundacion",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Lema
                        </label>

                        <input
                            type="text"
                            value={
                                configuracion.plataforma.lema
                            }
                            onChange={(event) =>
                                updateField(
                                    "plataforma",
                                    "lema",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Descripción
                        </label>

                        <textarea
                            rows="4"
                            value={
                                configuracion.plataforma.descripcion
                            }
                            onChange={(event) =>
                                updateField(
                                    "plataforma",
                                    "descripcion",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                </div>

                {/* =================================================
                    CONTACTO
                ================================================= */}

                <div className="settings-card">

                    <div className="form-section-title">

                        <h3>
                            Información de contacto
                        </h3>

                        <span>
                            Datos utilizados para comunicación
                        </span>

                    </div>

                    <div className="form-group">

                        <label>
                            Correo institucional
                        </label>

                        <input
                            type="email"
                            value={
                                configuracion.contacto.correo
                            }
                            onChange={(event) =>
                                updateField(
                                    "contacto",
                                    "correo",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Teléfono
                        </label>

                        <input
                            type="tel"
                            value={
                                configuracion.contacto.telefono
                            }
                            onChange={(event) =>
                                updateField(
                                    "contacto",
                                    "telefono",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            WhatsApp
                        </label>

                        <input
                            type="tel"
                            value={
                                configuracion.contacto.whatsapp
                            }
                            onChange={(event) =>
                                updateField(
                                    "contacto",
                                    "whatsapp",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Dirección
                        </label>

                        <textarea
                            rows="3"
                            value={
                                configuracion.contacto.direccion
                            }
                            onChange={(event) =>
                                updateField(
                                    "contacto",
                                    "direccion",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                </div>

                {/* =================================================
                    PÁGINA PRINCIPAL
                ================================================= */}

                <div className="settings-card">

                    <div className="form-section-title">

                        <h3>
                            Página principal
                        </h3>

                        <span>
                            Contenido principal mostrado a los usuarios
                        </span>

                    </div>

                    <div className="form-group">

                        <label>
                            Título principal
                        </label>

                        <input
                            type="text"
                            value={
                                configuracion.inicio.titulo
                            }
                            onChange={(event) =>
                                updateField(
                                    "inicio",
                                    "titulo",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Subtítulo
                        </label>

                        <input
                            type="text"
                            value={
                                configuracion.inicio.subtitulo
                            }
                            onChange={(event) =>
                                updateField(
                                    "inicio",
                                    "subtitulo",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Descripción principal
                        </label>

                        <textarea
                            rows="4"
                            value={
                                configuracion.inicio.descripcion
                            }
                            onChange={(event) =>
                                updateField(
                                    "inicio",
                                    "descripcion",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                </div>

                {/* =================================================
                    INSTITUCIONAL
                ================================================= */}

                <div className="settings-card">

                    <div className="form-section-title">

                        <h3>
                            Información institucional
                        </h3>

                        <span>
                            Contenido utilizado en la sección Nosotros
                        </span>

                    </div>

                    <div className="form-group">

                        <label>
                            Descripción institucional
                        </label>

                        <textarea
                            rows="5"
                            value={
                                configuracion.institucional.descripcion
                            }
                            onChange={(event) =>
                                updateField(
                                    "institucional",
                                    "descripcion",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Misión
                        </label>

                        <textarea
                            rows="5"
                            value={
                                configuracion.institucional.mision
                            }
                            onChange={(event) =>
                                updateField(
                                    "institucional",
                                    "mision",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Visión
                        </label>

                        <textarea
                            rows="5"
                            value={
                                configuracion.institucional.vision
                            }
                            onChange={(event) =>
                                updateField(
                                    "institucional",
                                    "vision",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                </div>

                {/* =================================================
                    REDES SOCIALES
                ================================================= */}

                <div className="settings-card">

                    <div className="form-section-title">

                        <h3>
                            Redes sociales
                        </h3>

                        <span>
                            Enlaces oficiales de la organización
                        </span>

                    </div>

                    <div className="form-group">

                        <label>
                            Facebook
                        </label>

                        <input
                            type="url"
                            placeholder="https://facebook.com/"
                            value={
                                configuracion.redes.facebook
                            }
                            onChange={(event) =>
                                updateField(
                                    "redes",
                                    "facebook",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Instagram
                        </label>

                        <input
                            type="url"
                            placeholder="https://instagram.com/"
                            value={
                                configuracion.redes.instagram
                            }
                            onChange={(event) =>
                                updateField(
                                    "redes",
                                    "instagram",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            LinkedIn
                        </label>

                        <input
                            type="url"
                            placeholder="https://linkedin.com/"
                            value={
                                configuracion.redes.linkedin
                            }
                            onChange={(event) =>
                                updateField(
                                    "redes",
                                    "linkedin",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            YouTube
                        </label>

                        <input
                            type="url"
                            placeholder="https://youtube.com/"
                            value={
                                configuracion.redes.youtube
                            }
                            onChange={(event) =>
                                updateField(
                                    "redes",
                                    "youtube",
                                    event.target.value
                                )
                            }
                        />

                    </div>

                </div>

                {/* =================================================
                    PUBLICACIONES
                ================================================= */}

                <div className="settings-card">

                    <div className="form-section-title">

                        <h3>
                            Publicaciones
                        </h3>

                        <span>
                            Control administrativo de oportunidades
                        </span>

                    </div>

                    <label className="switch-row">

                        <div>

                            <strong>
                                Revisión administrativa
                            </strong>

                            <small>
                                Revisar las oportunidades antes
                                de publicarlas.
                            </small>

                        </div>

                        <input
                            type="checkbox"
                            checked={
                                configuracion
                                    .publicaciones
                                    .revisionAdministrativa
                            }
                            onChange={(event) =>
                                updateField(
                                    "publicaciones",
                                    "revisionAdministrativa",
                                    event.target.checked
                                )
                            }
                        />

                    </label>

                    <label className="switch-row">

                        <div>

                            <strong>
                                Notificaciones
                            </strong>

                            <small>
                                Notificar al administrador sobre
                                nuevas postulaciones.
                            </small>

                        </div>

                        <input
                            type="checkbox"
                            checked={
                                configuracion
                                    .publicaciones
                                    .notificaciones
                            }
                            onChange={(event) =>
                                updateField(
                                    "publicaciones",
                                    "notificaciones",
                                    event.target.checked
                                )
                            }
                        />

                    </label>

                    <label className="switch-row">

                        <div>

                            <strong>
                                Permitir postulaciones
                            </strong>

                            <small>
                                Permitir que los usuarios se
                                postulen a oportunidades activas.
                            </small>

                        </div>

                        <input
                            type="checkbox"
                            checked={
                                configuracion
                                    .publicaciones
                                    .permitirPostulaciones
                            }
                            onChange={(event) =>
                                updateField(
                                    "publicaciones",
                                    "permitirPostulaciones",
                                    event.target.checked
                                )
                            }
                        />

                    </label>

                </div>

                {/* =================================================
                    ACCIONES
                ================================================= */}

                <div className="form-actions">

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={handleReset}
                    >
                        Restaurar valores
                    </button>

                    <button
                        type="submit"
                        className="primary-button"
                    >
                        Guardar configuración
                    </button>

                </div>

            </form>

            {/* =================================================
                TOAST
            ================================================= */}

            {saved && (

                <div className="toast show">
                    Configuración guardada correctamente.
                </div>

            )}

        </section>

    );
}

export default Configuracion;