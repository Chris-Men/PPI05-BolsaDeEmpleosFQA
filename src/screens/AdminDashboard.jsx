import { useEffect, useState } from "react";
import "../styleadmin.css";

function AdminDashboard() {
    const [activeMenu, setActiveMenu] = useState("Dashboard");
    const [search, setSearch] = useState("");
    const [selectedRow, setSelectedRow] = useState(null);
    const [notifications, setNotifications] = useState(false);

    const [stats, setStats] = useState({
        vacantes: 0,
        cvs: 0,
        empresas: 0,
        usuarios: 0,
    });

    // =====================================================
    // MENU
    // =====================================================

    const menuItems = [
        { icon: "🏠", name: "Dashboard" },
        { icon: "➕", name: "Nueva Postulación" },
        { icon: "📄", name: "Administrar Postulaciones" },
        { icon: "📁", name: "CV Recibidos" },
        { icon: "🏢", name: "Organizaciones" },
        { icon: "📚", name: "Categorías" },
        { icon: "📊", name: "Estadísticas" },
        { icon: "👥", name: "Usuarios" },
        { icon: "⚙", name: "Configuración" },
    ];

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
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    // =====================================================
    // CAMBIAR SECCIÓN
    // =====================================================

    const handleMenuClick = (name) => {
        setActiveMenu(name);
        setSelectedRow(null);
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
    // BUSCADOR
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
        <div className="container">

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <aside className="sidebar">

                {/* LOGO */}

                <div className="logo">

                    <div className="logo-icon">
                        FQA
                    </div>

                    <div className="logo-text">

                        <h2>
                            FQA Empleos
                        </h2>

                        <span>
                            Panel Administrativo
                        </span>

                    </div>

                </div>


                {/* MENU */}

                <nav className="menu">

                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            type="button"
                            className={`menu-item ${
                                activeMenu === item.name
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                handleMenuClick(
                                    item.name
                                )
                            }
                        >

                            <i>
                                {item.icon}
                            </i>

                            <span>
                                {item.name}
                            </span>

                        </button>
                    ))}

                </nav>


                {/* FOOTER */}

                <div className="sidebar-footer">

                    <div className="admin-photo">
                        A
                    </div>

                    <div>
                        <strong>
                            Administrador
                        </strong>

                        <small>
                            admin@fqa.org
                        </small>
                    </div>

                </div>

            </aside>


            {/* =================================================
                MAIN
            ================================================= */}

            <main className="main">

                {/* =================================================
                    TOPBAR
                ================================================= */}

                <header className="topbar">

                    <div className="top-left">

                        <h1>
                            {activeMenu}
                        </h1>

                        <span>
                            Bienvenido nuevamente
                        </span>

                    </div>


                    <div className="top-right">

                        {/* BUSCADOR */}

                        <div className="search">

                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        {/* NOTIFICACIONES */}

                        <button
                            type="button"
                            className="notification"
                            onClick={
                                handleNotifications
                            }
                        >
                            🔔
                        </button>


                        {/* PERFIL */}

                        <div className="profile">

                            <div className="avatar">
                                A
                            </div>

                            <div>

                                <strong>
                                    Administrador
                                </strong>

                                <small>
                                    Super Admin
                                </small>

                            </div>

                        </div>

                    </div>

                </header>


                {/* =================================================
                    CONTENT
                ================================================= */}

                <section className="content">

                    {/* =================================================
                        CARDS
                    ================================================= */}

                    <div className="cards">

                        <div className="card">

                            <span>
                                Vacantes Activas
                            </span>

                            <h2>
                                {stats.vacantes}
                            </h2>

                        </div>


                        <div className="card">

                            <span>
                                CV Recibidos
                            </span>

                            <h2>
                                {stats.cvs}
                            </h2>

                        </div>


                        <div className="card">

                            <span>
                                Empresas
                            </span>

                            <h2>
                                {stats.empresas}
                            </h2>

                        </div>


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
                        TABLA
                    ================================================= */}

                    <div className="table-box">

                        <div className="table-header">

                            <h3>
                                Últimas Postulaciones
                            </h3>

                            <button
                                type="button"
                                onClick={() =>
                                    alert(
                                        "Aquí mostraremos todas las postulaciones."
                                    )
                                }
                            >
                                Ver Todas
                            </button>

                        </div>


                        <table>

                            <thead>

                                <tr>
                                    <th>Puesto</th>
                                    <th>Empresa</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                    <th></th>
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


                                {filteredPostulaciones.length ===
                                    0 && (

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