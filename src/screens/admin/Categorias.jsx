import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function Categorias({
    currentUser,
    handleLogout,
    adminTab,
    setAdminTab
}) {

    const [search, setSearch] = useState("");

    const handleMenuClick = (name) => {
        setAdminTab(name);
    };

    const handleNotifications = () => {
        // Aquí irán las notificaciones
    };

    return (
        <div className="admin-container">

            {/* SIDEBAR */}
            <AdminSidebar
                activeMenu="Categorías"
                onMenuClick={handleMenuClick}
            />

            {/* CONTENIDO PRINCIPAL */}
            <main className="admin-main">

                {/* TOPBAR */}
                <AdminTopbar
                    activeMenu="Categorías"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                {/* CONTENIDO */}
                <section className="content">

                    <div className="content-header">

                        <div>
                            <h1>Categorías</h1>

                            <p>
                                Administra las categorías y áreas
                                disponibles en la plataforma.
                            </p>
                        </div>

                    </div>

                    <div className="admin-card">

                        <div className="admin-card-header">

                            <div>
                                <h2>
                                    Categorías disponibles
                                </h2>

                                <p>
                                    Aquí podrás administrar las
                                    categorías de las vacantes.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="admin-btn-primary"
                            >
                                + Nueva categoría
                            </button>

                        </div>

                        <div className="admin-empty-state">

                            <div className="admin-empty-icon">
                                🗂️
                            </div>

                            <h3>
                                No hay categorías registradas
                            </h3>

                            <p>
                                Las categorías que agregues aparecerán
                                en esta sección.
                            </p>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Categorias;