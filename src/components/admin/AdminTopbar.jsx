import React, { useState } from "react";

function AdminTopbar({
    activeMenu,
    search,
    setSearch,
    onNotifications,
    handleLogout
}) {

    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <header className="topbar">

            {/* TÍTULO */}
            <div className="top-left">

                <h1>
                    {activeMenu}
                </h1>

                <span>
                    Bienvenido nuevamente
                </span>

            </div>


            {/* PARTE DERECHA */}
            <div className="top-right">

                {/* BUSCADOR
                <div className="search">

                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div> */}


                {/* NOTIFICACIONES */}
                <button
                    type="button"
                    className="notification"
                    onClick={onNotifications}
                    aria-label="Notificaciones"
                >
                    🔔
                </button>


                {/* PERFIL */}
                <div className="profile-container">

                    <button
                        type="button"
                        className="profile"
                        onClick={() => setProfileOpen(!profileOpen)}
                    >

                        <div className="avatar">
                            A
                        </div>

                        <div className="profile-info">

                            <strong>
                                Administrador
                            </strong>

                            <small>
                                Super Admin
                            </small>

                        </div>

                        <span className="profile-arrow">
                            {profileOpen ? "▲" : "▼"}
                        </span>

                    </button>


                    {profileOpen && (

                        <div className="profile-menu">

                            {/* <div className="profile-menu-header">

                                <strong>
                                    Administrador
                                </strong>

                                <small>
                                    Super Admin
                                </small>

                            </div>

                            <div className="profile-menu-divider"></div> */}

                            <button
                                type="button"
                                className="profile-logout"
                                onClick={handleLogout}
                            >
                                Cerrar sesión
                                <span>↩</span>
                            </button>

                        </div>

                    )}

                </div>

            </div>

        </header>
    );
}

export default AdminTopbar;