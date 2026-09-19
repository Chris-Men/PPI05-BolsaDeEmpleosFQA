import { useEffect, useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";
import "../../styles/admin/dashboard.css";

import NuevaPostulacion from "./NuevaPostulacion";
import AdministrarPostulaciones from "./AdministrarPostulaciones";
import CVrecibidos from "./CVrecibidos";
import Organizaciones from "./Organizaciones";
import Categorias from "./Categorias";
import Estadisticas from "./Estadisticas";
import Users from "./Users";
import Configuracion from "./configuracion";

function AdminDashboard({
    currentUser,
    handleLogout,

    jobs = [],

    newJobForm = {},
    setNewJobForm,

    handleCreateJob,
    handleUpdateJob,
    handleSaveDraft,

    applications = [],
    handleUpdateAppStatus,

    configuration,
    setConfiguration,
    updateConfiguration,
    updateConfigurations,
    resetConfiguration,
}) {

    const [activeMenu, setActiveMenu] =
        useState("Dashboard");

    const [menuHistory, setMenuHistory] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [notifications, setNotifications] =
        useState(false);

    const [editingJobId, setEditingJobId] =
        useState(null);

    const [stats, setStats] = useState({
        vacantes: 0,
        cvs: 0,
        empresas: 18,
        usuarios: 4,
    });

    // =========================================================
    // ESTADÍSTICAS
    // =========================================================

    useEffect(() => {

        const objetivos = {
            vacantes: jobs.length,
            cvs: applications.length,
            empresas: 18,
            usuarios: 4,
        };

        const duration = 700;
        const startTime = Date.now();

        let animationFrame;

        const animate = () => {

            const elapsed =
                Date.now() - startTime;

            const progress =
                Math.min(
                    elapsed / duration,
                    1
                );

            setStats({
                vacantes:
                    Math.floor(
                        objetivos.vacantes *
                        progress
                    ),

                cvs:
                    Math.floor(
                        objetivos.cvs *
                        progress
                    ),

                empresas:
                    objetivos.empresas,

                usuarios:
                    objetivos.usuarios,
            });

            if (progress < 1) {

                animationFrame =
                    requestAnimationFrame(
                        animate
                    );
            }
        };

        animate();

        return () => {

            if (animationFrame) {
                cancelAnimationFrame(
                    animationFrame
                );
            }
        };

    }, [jobs.length, applications.length]);

    // =========================================================
    // NAVEGACIÓN
    // =========================================================

    const navegarA = nombre => {

        if (!nombre) return;

        if (nombre === activeMenu) return;

        setMenuHistory(previous => [
            ...previous,
            activeMenu
        ]);

        setActiveMenu(nombre);
        setSearch("");
    };

    const handleMenuClick = name => {
        navegarA(name);
    };

    // =========================================================
    // REGRESAR
    // =========================================================

    const handleBack = () => {

        if (menuHistory.length === 0) {

            setActiveMenu("Dashboard");
            setEditingJobId(null);
            setSearch("");

            return;
        }

        const historyCopy = [
            ...menuHistory
        ];

        const previousScreen =
            historyCopy.pop();

        setMenuHistory(historyCopy);
        setActiveMenu(previousScreen);
        setSearch("");
        setEditingJobId(null);
    };

    const handleBackFromNewJob = () => {

        setEditingJobId(null);

        handleBack();
    };

    // =========================================================
    // GUARDAR BORRADOR
    // =========================================================

    const handleDraft = async () => {

        if (!newJobForm?.title?.trim()) {

            return {
                success: false,
                message:
                    "No se pudo guardar el borrador porque falta ingresar el título de la vacante."
            };
        }

        if (
            typeof handleSaveDraft !==
            "function"
        ) {

            return {
                success: false,
                message:
                    "No se pudo guardar el borrador porque la función para guardar borradores no está disponible."
            };
        }

        try {

            const resultado =
                await handleSaveDraft();

            if (
                resultado &&
                typeof resultado === "object"
            ) {
                return resultado;
            }

            return {
                success: true,
                message:
                    "El borrador se guardó correctamente."
            };

        } catch (error) {

            console.error(
                "Error al guardar el borrador:",
                error
            );

            return {
                success: false,
                message:
                    error?.message ||
                    "No se pudo guardar el borrador. Ocurrió un error durante el proceso."
            };
        }
    };

    // =========================================================
    // EDITAR VACANTE
    // =========================================================

    const handleEditJob = job => {

        if (!job) return;

        setEditingJobId(job.id);

        if (
            typeof setNewJobForm ===
            "function"
        ) {

            setNewJobForm({

                title: job.title || "",

                org: job.org || "",

                location:
                    job.location || "",

                area:
                    job.area ||
                    "Educación",

                type:
                    job.type ||
                    "Tiempo completo",

                salary:
                    job.salary || "",

                deadline:
                    job.deadline ||
                    job.closing ||
                    "",

                desc:
                    job.desc || "",

                responsibilities:
                    Array.isArray(
                        job.responsibilities
                    )
                        ? job.responsibilities.join(", ")
                        : job.responsibilities || "",

                requirements:
                    Array.isArray(
                        job.requirements
                    )
                        ? job.requirements.join(", ")
                        : job.requirements || "",

                offers:
                    Array.isArray(
                        job.offers
                    )
                        ? job.offers.join(", ")
                        : job.offers || "",

                status:
                    job.status ||
                    job.estado ||
                    "Activa",
            });
        }

        setMenuHistory(previous => [
            ...previous,
            "Administrar Postulaciones"
        ]);

        setActiveMenu(
            "Nueva Postulación"
        );

        setSearch("");
    };

    // =========================================================
    // CREAR / ACTUALIZAR VACANTE
    // =========================================================

    const handleSubmitJob = async (event) => {

        // Evita el error cuando existe un evento real
        if (event?.preventDefault) {
            event.preventDefault();
        }

        // =====================================================
        // EDITAR VACANTE
        // =====================================================

        if (editingJobId !== null) {

            if (
                typeof handleUpdateJob !==
                "function"
            ) {

                return {
                    success: false,
                    message:
                        "No se pudo actualizar la vacante porque la función de actualización no está disponible."
                };
            }

            try {

                const resultado =
                    await handleUpdateJob(
                        editingJobId,
                        newJobForm,
                        event
                    );

                setEditingJobId(null);

                if (
                    resultado &&
                    typeof resultado === "object"
                ) {

                    return resultado;
                }

                return {
                    success: true,
                    message:
                        "La vacante fue actualizada correctamente."
                };

            } catch (error) {

                console.error(
                    "Error al actualizar la vacante:",
                    error
                );

                return {
                    success: false,
                    message:
                        error?.message ||
                        "No se pudo actualizar la vacante. Ocurrió un error durante el proceso."
                };
            }
        }

        // =====================================================
        // CREAR NUEVA VACANTE
        // =====================================================

        if (
            typeof handleCreateJob !==
            "function"
        ) {

            return {
                success: false,
                message:
                    "No se pudo publicar la vacante porque la función de creación no está disponible."
            };
        }

        try {

            /*
             * NuevaPostulacion llama:
             *
             * onPublish()
             *
             * Por eso no existe un evento real.
             *
             * Se crea un objeto compatible para evitar
             * el error:
             *
             * Cannot read properties of undefined
             * (reading 'preventDefault')
             */

            const eventoSeguro = {
                preventDefault: () => {}
            };

            const resultado =
                await handleCreateJob(
                    eventoSeguro
                );

            if (
                resultado &&
                typeof resultado === "object"
            ) {

                return resultado;
            }

            return {
                success: true,
                message:
                    "La vacante fue publicada correctamente."
            };

        } catch (error) {

            console.error(
                "Error al publicar la vacante:",
                error
            );

            let mensaje =
                "No se pudo publicar la vacante. Ocurrió un error durante el proceso.";

            if (
                error?.response?.data?.message
            ) {

                mensaje =
                    error.response.data.message;

            } else if (
                error?.message
            ) {

                mensaje =
                    error.message;
            }

            return {
                success: false,
                message: mensaje
            };
        }
    };

    // =========================================================
    // NOTIFICACIONES
    // =========================================================

    const handleNotifications = () => {

        setNotifications(true);

        setTimeout(() => {
            setNotifications(false);
        }, 3000);
    };

    // =========================================================
    // OBTENER ESTADO DE VACANTE
    // =========================================================

    const obtenerEstadoVacante = job => {

        const estado =
            job?.status ||
            job?.estado ||
            "Activa";

        const estadosValidos = [
            "Activa",
            "Inactiva",
            "Cerrada",
            "Borrador"
        ];

        if (
            estadosValidos.includes(
                estado
            )
        ) {

            return estado;
        }

        return "Activa";
    };

    // =========================================================
    // CLASE DEL ESTADO
    // =========================================================

    const obtenerClaseEstado = estado => {

        switch (estado) {

            case "Activa":
                return "status-active";

            case "Inactiva":
                return "status-inactive";

            case "Cerrada":
                return "status-closed";

            case "Borrador":
                return "status-draft";

            default:
                return "status-active";
        }
    };

    // =========================================================
    // DASHBOARD
    // =========================================================

    const renderDashboard = () => {

        const vacantesActividad =
            jobs
                .slice(0, 10)
                .map(job => {

                    const estado =
                        obtenerEstadoVacante(
                            job
                        );

                    return {

                        id: job.id,

                        puesto:
                            job.title ||
                            "Sin título",

                        empresa:
                            job.org ||
                            "Sin organización",

                        estado,

                        candidatos:
                            job.views ||
                            job.applicants ||
                            0,
                    };
                });

        const filteredVacantes =
            vacantesActividad.filter(item => {

                const texto =
                    `${item.puesto}
                    ${item.empresa}
                    ${item.estado}
                    ${item.candidatos}`;

                return texto
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    );
            });

        return (
            <>

                <div className="cards">

                    <div className="card">
                        <span>
                            Vacantes
                        </span>

                        <h2>
                            {stats.vacantes}
                        </h2>

                        <span className="card-detail">
                            Vacantes registradas
                        </span>
                    </div>

                    <div className="card">
                        <span>
                            CV recibidos
                        </span>

                        <h2>
                            {stats.cvs}
                        </h2>

                        <span className="card-detail">
                            Postulaciones recibidas
                        </span>
                    </div>

                    <div className="card">
                        <span>
                            Organizaciones
                        </span>

                        <h2>
                            {stats.empresas}
                        </h2>

                        <span className="card-detail">
                            Organizaciones registradas
                        </span>
                    </div>

                    <div className="card">
                        <span>
                            Usuarios
                        </span>

                        <h2>
                            {stats.usuarios}
                        </h2>

                        <span className="card-detail">
                            Usuarios registrados
                        </span>
                    </div>

                </div>

                <div className="dashboard-grid">

                    <div className="table-box">

                        <div className="table-header">

                            <div>

                                <h3>
                                    Vacantes recientes
                                </h3>

                                <span className="section-description">
                                    Últimas oportunidades
                                    registradas.
                                </span>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    navegarA(
                                        "Administrar Postulaciones"
                                    )
                                }
                            >
                                Ver todas
                            </button>

                        </div>

                        <div className="table-responsive">

                            {filteredVacantes.length === 0 ? (

                                <div className="empty">
                                    No hay vacantes
                                    registradas.
                                </div>

                            ) : (

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Puesto
                                            </th>

                                            <th>
                                                Organización
                                            </th>

                                            <th>
                                                Estado
                                            </th>

                                            <th>
                                                Candidatos
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {filteredVacantes.map(
                                            item => (

                                                <tr
                                                    key={
                                                        item.id
                                                    }
                                                >

                                                    <td>
                                                        {
                                                            item.puesto
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            item.empresa
                                                        }
                                                    </td>

                                                    <td>

                                                        <span
                                                            className={
                                                                `status ${obtenerClaseEstado(
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
                                                        {
                                                            item.candidatos
                                                        }
                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>
                            )}

                        </div>

                    </div>

                    <div className="attention-box">

                        <div className="attention-header">

                            <div>

                                <h3>
                                    Atención requerida
                                </h3>

                                <span>
                                    Resumen administrativo
                                </span>

                            </div>

                        </div>

                        <div className="attention-list">

                            <button
                                type="button"
                                className="attention-item"
                                onClick={() =>
                                    navegarA(
                                        "Administrar Postulaciones"
                                    )
                                }
                            >

                                <div className="attention-number">
                                    {
                                        applications.length
                                    }
                                </div>

                                <div className="attention-content">

                                    <strong>
                                        Postulaciones
                                    </strong>

                                    <span>
                                        Revisar postulaciones
                                        recibidas.
                                    </span>

                                </div>

                                <div className="attention-arrow">
                                    →
                                </div>

                            </button>

                            <button
                                type="button"
                                className="attention-item"
                                onClick={() =>
                                    navegarA(
                                        "CV Recibidos"
                                    )
                                }
                            >

                                <div className="attention-number">
                                    {
                                        applications.length
                                    }
                                </div>

                                <div className="attention-content">

                                    <strong>
                                        CV recibidos
                                    </strong>

                                    <span>
                                        Revisar currículums
                                        enviados.
                                    </span>

                                </div>

                                <div className="attention-arrow">
                                    →
                                </div>

                            </button>

                            <button
                                type="button"
                                className="attention-item"
                                onClick={() =>
                                    navegarA(
                                        "Nueva Postulación"
                                    )
                                }
                            >

                                <div className="attention-number">
                                    +
                                </div>

                                <div className="attention-content">

                                    <strong>
                                        Nueva Postulación
                                    </strong>

                                    <span>
                                        Registrar una nueva
                                        oportunidad laboral.
                                    </span>

                                </div>

                                <div className="attention-arrow">
                                    →
                                </div>

                            </button>

                        </div>

                    </div>

                </div>

            </>
        );
    };

    // =========================================================
    // CONTENIDO
    // =========================================================

    const renderContent = () => {

        switch (activeMenu) {

            case "Dashboard":

                return renderDashboard();

            case "Nueva Postulación":

                return (
                    <NuevaPostulacion
    newJobForm={
        newJobForm
    }

    setNewJobForm={
        setNewJobForm
    }

    onPublish={
        handleSubmitJob
    }

    onSaveDraft={
        handleDraft
    }

    onBack={
        handleBackFromNewJob
    }

    isEditing={
        editingJobId !== null
    }
/>
                );

            case "Administrar Postulaciones":

                return (
                    <AdministrarPostulaciones

                        jobs={
                            jobs
                        }

                        applications={
                            applications
                        }

                        onEditJob={
                            handleEditJob
                        }

                        onDeleteJob={
                            undefined
                        }

                        onUpdateAppStatus={
                            handleUpdateAppStatus
                        }

                        adminTab={
                            activeMenu
                        }

                        setAdminTab={
                            setActiveMenu
                        }

                    />
                );

            case "CV Recibidos":

                return (
                    <CVrecibidos
                        applications={
                            applications
                        }

                        jobs={
                            jobs
                        }

                        adminTab={
                            activeMenu
                        }

                        setAdminTab={
                            setActiveMenu
                        }
                    />
                );

            case "Organizaciones":

                return (
                    <Organizaciones
                        adminTab={
                            activeMenu
                        }

                        setAdminTab={
                            setActiveMenu
                        }
                    />
                );

            case "Categorías":

                return (
                    <Categorias
                        search={
                            search
                        }

                        adminTab={
                            activeMenu
                        }

                        setAdminTab={
                            setActiveMenu
                        }
                    />
                );

            case "Estadísticas":

                return (
                    <Estadisticas
                        jobs={
                            jobs
                        }

                        applications={
                            applications
                        }

                        adminTab={
                            activeMenu
                        }

                        setAdminTab={
                            setActiveMenu
                        }
                    />
                );

            case "Usuarios":

                return (
                    <Users
                        search={
                            search
                        }

                        adminTab={
                            activeMenu
                        }

                        setAdminTab={
                            setActiveMenu
                        }
                    />
                );

            case "Configuración":

                return (
                    <Configuracion
                        configuration={
                            configuration
                        }

                        setConfiguration={
                            setConfiguration
                        }

                        updateConfiguration={
                            updateConfiguration
                        }

                        updateConfigurations={
                            updateConfigurations
                        }

                        resetConfiguration={
                            resetConfiguration
                        }

                        adminTab={
                            activeMenu
                        }

                        setAdminTab={
                            setActiveMenu
                        }
                    />
                );

            default:

                return (
                    <div className="empty">
                        Sección no encontrada:
                        {" "}
                        {activeMenu}
                    </div>
                );
        }
    };

    return (

        <div className="admin-container">

            <AdminSidebar
                activeMenu={
                    activeMenu
                }

                onMenuClick={
                    handleMenuClick
                }
            />

            <main className="admin-main">

                <AdminTopbar
                    activeMenu={
                        activeMenu
                    }

                    search={
                        search
                    }

                    setSearch={
                        setSearch
                    }

                    onNotifications={
                        handleNotifications
                    }

                    handleLogout={
                        handleLogout
                    }
                />

                <section className="content">

                    {renderContent()}

                </section>

            </main>

            {notifications && (

                <div className="toast show">
                    No hay nuevas
                    notificaciones.
                </div>

            )}

        </div>
    );
}

export default AdminDashboard;