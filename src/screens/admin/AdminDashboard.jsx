import { useEffect, useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/dashboard.css";
import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-topbar.css";
import "../../styles/admin/admin-sidebar.css";

function AdminDashboard({
    currentUser,
    handleLogout,
    adminTab,
    setAdminTab,
    jobs,
    setJobs,
    newJobForm,
    setNewJobForm,
    handleCreateJob,
    handleAdminDeleteJob,
    applications,
    handleUpdateAppStatus
}) {

    // =====================================================
    // ESTADOS LOCALES
    // =====================================================

    const [search, setSearch] = useState("");

    const [selectedRow, setSelectedRow] = useState(null);

    const [notifications, setNotifications] = useState(false);

    // =====================================================
    // ESTADÍSTICAS
    // =====================================================

    const [stats, setStats] = useState({
        vacantes: 0,
        cvs: 0,
        empresas: 0,
        usuarios: 0,
    });

    // =====================================================
    // POSTULACIONES
    // =====================================================

    const postulaciones = [
        {
            id: 1,
            puesto: "Diseñador Gráfico",
            empresa: "FQA",
            estado: "Activa",
            fecha: "Hoy",
        },
        {
            id: 2,
            puesto: "Programador Laravel",
            empresa: "ULS",
            estado: "Activa",
            fecha: "Ayer",
        },
    ];

    // =====================================================
    // ANIMACIÓN DE CONTADORES
    // =====================================================

    useEffect(() => {

        const objetivos = {
            vacantes: 28,
            cvs: 135,
            empresas: 18,
            usuarios: 4,
        };

        const duration = 1000;

        const startTime = Date.now();

        let animationFrame;

        const animate = () => {

            const elapsed =
                Date.now() - startTime;

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
                    requestAnimationFrame(
                        animate
                    );

            }

        };

        animate();

        return () => {

            cancelAnimationFrame(
                animationFrame
            );

        };

    }, []);

    // =====================================================
    // CAMBIAR MENÚ ADMINISTRATIVO
    // =====================================================

    const handleMenuClick = (name) => {

        setAdminTab(name);

        setSelectedRow(null);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    };

    // =====================================================
    // NOTIFICACIONES
    // =====================================================

    const handleNotifications = () => {

        setNotifications(true);

        setTimeout(() => {

            setNotifications(false);

        }, 3000);

    };

    // =====================================================
    // FILTRO DE POSTULACIONES
    // =====================================================

    const filteredPostulaciones =
        postulaciones.filter((item) => {

            const texto = `
                ${item.puesto}
                ${item.empresa}
                ${item.estado}
                ${item.fecha}
            `.toLowerCase();

            return texto.includes(
                search.toLowerCase()
            );

        });

    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="admin-container">

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <AdminSidebar
                activeMenu={adminTab}
                onMenuClick={handleMenuClick}
            />

            {/* =================================================
                MAIN
            ================================================= */}

            <main className="admin-main">

                {/* =================================================
                    TOPBAR
                ================================================= */}

                <AdminTopbar
                    activeMenu={adminTab}
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                {/* =================================================
                    CONTENIDO DEL DASHBOARD
                ================================================= */}

                <section className="content">

                    {/* =================================================
                        CARDS
                    ================================================= */}

                    <div className="cards">

                        {/* VACANTES */}

                        <div className="card">

                            <span>
                                Vacantes Activas
                            </span>

                            <h2>
                                {stats.vacantes}
                            </h2>

                        </div>

                        {/* CV */}

                        <div className="card">

                            <span>
                                CV Recibidos
                            </span>

                            <h2>
                                {stats.cvs}
                            </h2>

                        </div>

                        {/* EMPRESAS */}

                        <div className="card">

                            <span>
                                Empresas
                            </span>

                            <h2>
                                {stats.empresas}
                            </h2>

                        </div>

                        {/* USUARIOS */}

                        <div className="card">

                            <span>
                                Usuarios
                            </span>

                            <h2>
                                {stats.usuarios}
                            </h2>

                        </div>

                    </div>

                    {/* =================================================
                        ÚLTIMAS POSTULACIONES
                    ================================================= */}

                    <div className="table-box">

                        {/* HEADER */}

                        <div className="table-header">

                            <h3>
                                Últimas Postulaciones
                            </h3>

                            <button
                                type="button"
                                onClick={() =>
                                    setAdminTab(
                                        "Postulaciones"
                                    )
                                }
                            >
                                Ver Todas
                            </button>

                        </div>

                        {/* TABLA */}

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Puesto
                                    </th>

                                    <th>
                                        Empresa
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Fecha
                                    </th>

                                    <th>
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {filteredPostulaciones.map(
                                    (item) => (

                                        <tr
                                            key={item.id}

                                            className={
                                                selectedRow ===
                                                item.id
                                                    ? "selected"
                                                    : ""
                                            }

                                            onClick={() =>
                                                setSelectedRow(
                                                    item.id
                                                )
                                            }
                                        >

                                            <td>
                                                {item.puesto}
                                            </td>

                                            <td>
                                                {item.empresa}
                                            </td>

                                            <td>

                                                <span className="status">
                                                    {item.estado}
                                                </span>

                                            </td>

                                            <td>
                                                {item.fecha}
                                            </td>

                                            <td>

                                                <button
                                                    type="button"
                                                    className="edit-button"

                                                    onClick={(e) => {

                                                        e.stopPropagation();

                                                        alert(
                                                            `Editando: ${item.puesto}`
                                                        );

                                                    }}
                                                >
                                                    Editar
                                                </button>

                                            </td>

                                        </tr>

                                    )
                                )}

                                {/* SIN RESULTADOS */}

                                {filteredPostulaciones.length === 0 && (

                                    <tr>

                                        <td
                                            colSpan="5"
                                            className="empty"
                                        >
                                            No se encontraron
                                            postulaciones.
                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </table>

                    </div>

                </section>

            </main>

            {/* =================================================
                TOAST
            ================================================= */}

            {notifications && (

                <div className="toast show">

                    No hay nuevas notificaciones.

                </div>

            )}

        </div>

    );

}

export default AdminDashboard;