import React from "react";

import logoCompleto from "../../components/imagenes/logo/logo 2.png";
import logoIcono from "../../components/imagenes/logo/logo 3.png";

function AdminSidebar({
    activeMenu,
    onMenuClick
}) {

    const menuItems = [
        {
            icon: "🏠",
            name: "Dashboard"
        },
        {
            icon: "➕",
            name: "Nueva Postulación"
        },
        {
            icon: "📄",
            name: "Administrar Postulaciones"
        },
        {
            icon: "📁",
            name: "CV Recibidos"
        },
        {
            icon: "🏢",
            name: "Organizaciones"
        },
        {
            icon: "📚",
            name: "Categorías"
        },
        {
            icon: "📊",
            name: "Estadísticas"
        },
        {
            icon: "👥",
            name: "Usuarios"
        },
        {
            icon: "⚙️",
            name: "Configuración"
        }
    ];

    return (
        <aside className="sidebar">

            {/* =====================================================
                LOGO
            ===================================================== */}

            <button
                type="button"
                className="logo"
                onClick={() => onMenuClick("Dashboard")}
                title="Ir al Dashboard"
            >

                <picture>

                    {/* Logo pequeño para tablet y móvil */}
                    <source
                        media="(max-width: 900px)"
                        srcSet={logoIcono}
                    />

                    {/* Logo completo para escritorio */}
                    <img
                        src={logoCompleto}
                        alt="Fundación Quintanilla Amaya"
                        className="logo-image"
                    />

                </picture>

            </button>


            {/* =====================================================
                MENÚ
            ===================================================== */}

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
                        onClick={() => onMenuClick(item.name)}
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


            {/* =====================================================
                ADMINISTRADOR
            ===================================================== */}

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
    );
}

export default AdminSidebar;