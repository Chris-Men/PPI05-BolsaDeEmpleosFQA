import React from "react";

function AdminTopbar({
    activeMenu,
    search,
    setSearch,
    onNotifications
}) {

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

                {/* BUSCADOR */}
                <div className="search">

                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div>


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
    );
}

export default AdminTopbar;