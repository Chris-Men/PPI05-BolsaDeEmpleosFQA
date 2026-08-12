import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function NuevaPostulacion({
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
                activeMenu="Nueva Postulación"
                onMenuClick={handleMenuClick}
            />

            {/* CONTENIDO PRINCIPAL */}
            <main className="admin-main">

                {/* TOPBAR */}
                <AdminTopbar
                    activeMenu="Nueva Postulación"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                {/* CONTENIDO */}
                <section className="content">

                    <div className="content-header">

                        <div>
                            <h1>Nueva Postulación</h1>

                            <p>
                                Registra y administra nuevas postulaciones
                                de candidatos.
                            </p>
                        </div>

                    </div>

                    <div className="admin-card">

                        <div className="admin-card-header">

                            <div>
                                <h2>
                                    Registrar nueva postulación
                                </h2>

                                <p>
                                    Aquí podrás crear una nueva
                                    postulación para una vacante.
                                </p>
                            </div>

                        </div>

                        <div className="admin-empty-state">

                            <div className="admin-empty-icon">
                                📝
                            </div>

                            <h3>
                                Nueva postulación
                            </h3>

                            <p>
                                El formulario para registrar una
                                nueva postulación estará disponible aquí.
                            </p>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default NuevaPostulacion;