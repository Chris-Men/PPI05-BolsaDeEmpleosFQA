import React from "react";

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


            {/* MENÚ */}
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
                        onClick={() => {
                            onMenuClick(item.name);
                        }}
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


            {/* ADMINISTRADOR */}
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