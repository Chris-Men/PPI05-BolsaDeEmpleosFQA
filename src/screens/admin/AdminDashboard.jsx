import { useEffect, useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";
import "../../styles/admin/dashboard.css";

import NuevaPostulacion from "./NuevaPostulacion";
import AdministrarPostulaciones from "./AdministrarPostulaciones";
import CVRecibidos from "./CVRecibidos";
import Organizaciones from "./Organizaciones";
import Categorias from "./Categorias";
import Estadisticas from "./Estadisticas";
import Users from "./Users";
import Configuracion from "./Configuracion";

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
    // =========================================================
    // ESTADOS
    // =========================================================

    const [activeMenu, setActiveMenu] = useState("Dashboard");

    const [menuHistory, setMenuHistory] = useState([]);

    const [search, setSearch] = useState("");

    const [notifications, setNotifications] = useState(false);

    const [editingJobId, setEditingJobId] = useState(null);

    const [stats, setStats] = useState({
        vacantes: 0,
        cvs: 0,
        empresas: 0,
        usuarios: 0,
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

        const duration = 1000;
        const startTime = Date.now();

        let animationFrame;

        const animate = () => {
            const elapsed = Date.now() - startTime;

            const progress = Math.min(
                elapsed / duration,
                1
            );

            setStats({
                vacantes: Math.floor(
                    objetivos.vacantes * progress
                ),

                cvs: Math.floor(
                    objetivos.cvs * progress
                ),

                empresas: Math.floor(
                    objetivos.empresas * progress
                ),

                usuarios: Math.floor(
                    objetivos.usuarios * progress
                ),
            });

            if (progress < 1) {
                animationFrame =
                    requestAnimationFrame(animate);
            }
        };

        animate();

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [jobs, applications]);

    // =========================================================
    // NAVEGACIÓN
    // =========================================================

    const navegarA = (nombre) => {
        if (!nombre) {
            return;
        }

        if (nombre === activeMenu) {
            return;
        }

        setMenuHistory((historialAnterior) => [
            ...historialAnterior,
            activeMenu,
        ]);

        setActiveMenu(nombre);

        setSearch("");
    };

    const handleMenuClick = (name) => {
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

        const historialAnterior = [
            ...menuHistory,
        ];

        const previousScreen =
            historialAnterior.pop();

        setMenuHistory(historialAnterior);

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

    const handleDraft = () => {
        if (!newJobForm?.title?.trim()) {
            return;
        }

        if (
            typeof handleSaveDraft ===
            "function"
        ) {
            handleSaveDraft();
        }
    };

    // =========================================================
    // EDITAR VACANTE
    // =========================================================

    const handleEditJob = (job) => {
        if (!job) {
            return;
        }

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
                        ? job.responsibilities.join(
                              ", "
                          )
                        : job.responsibilities ||
                          "",

                requirements:
                    Array.isArray(
                        job.requirements
                    )
                        ? job.requirements.join(
                              ", "
                          )
                        : job.requirements ||
                          "",

                offers:
                    Array.isArray(
                        job.offers
                    )
                        ? job.offers.join(
                              ", "
                          )
                        : job.offers ||
                          "",
            });
        }

        setMenuHistory(
            (previous) => [
                ...previous,
                "Administrar Postulaciones",
            ]
        );

        setActiveMenu(
            "Nueva Postulación"
        );

        setSearch("");
    };

    // =========================================================
    // CREAR / ACTUALIZAR VACANTE
    // =========================================================

    const handleSubmitJob = (event) => {
        if (editingJobId !== null) {
            if (
                typeof handleUpdateJob ===
                "function"
            ) {
                handleUpdateJob(
                    editingJobId,
                    newJobForm,
                    event
                );

                setEditingJobId(null);
            }

            return;
        }

        if (
            typeof handleCreateJob ===
            "function"
        ) {
            handleCreateJob(event);
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
    // DASHBOARD
    // =========================================================

    const renderDashboard = () => {
        const vacantesActividad =
            jobs
                .slice(0, 10)
                .map((job) => ({
                    id: job.id,

                    puesto:
                        job.title ||
                        "Sin título",

                    empresa:
                        job.org ||
                        "Sin organización",

                    estado:
                        job.status ||
                        "Activa",

                    candidatos:
                        job.views || 0,
                }));

        const filteredVacantes =
            vacantesActividad.filter(
                (item) =>
                    `${item.puesto} ${item.empresa} ${item.estado} ${item.candidatos}`
                        .toLowerCase()
                        .includes(
                            search.toLowerCase()
                        )
            );

        return (
            <>
                {/* =================================================
                    TARJETAS
                ================================================= */}

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


                {/* =================================================
                    COLUMNAS DEL DASHBOARD
                ================================================= */}

                <div className="dashboard-grid">

                    {/* =================================================
                        VACANTES RECIENTES
                    ================================================= */}

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


                            {/* BOTÓN VER TODAS */}

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

                            {filteredVacantes.length ===
                            0 ? (

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
                                            (item) => (

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

                                                        <span className="status">
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


                    {/* =================================================
                        ATENCIÓN REQUERIDA
                    ================================================= */}

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

                            {/* POSTULACIONES */}

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


                            {/* CV RECIBIDOS */}

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


                            {/* NUEVA POSTULACIÓN */}

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
    // CONTENIDO SEGÚN MENÚ
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
                    />
                );


            case "Administrar Postulaciones":

                return (
                    <AdministrarPostulaciones
                        jobs={jobs}

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
                    <CVRecibidos
                        applications={
                            applications
                        }

                        jobs={jobs}

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

    // =========================================================
    // RENDER PRINCIPAL
    // =========================================================

    return (
        <div className="admin-container">

            {/* SIDEBAR */}

            <AdminSidebar
                activeMenu={
                    activeMenu
                }

                onMenuClick={
                    handleMenuClick
                }
            />


            {/* ÁREA PRINCIPAL */}

            <main className="admin-main">

                {/* TOPBAR */}

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
                />


                {/* CONTENIDO */}

                <section className="content">

                    {renderContent()}

                </section>

            </main>


            {/* TOAST */}

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