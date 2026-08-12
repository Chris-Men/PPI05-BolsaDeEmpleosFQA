import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function Estadisticas({
    currentUser,
    handleLogout,
    adminTab,
    setAdminTab,
}) {
    const [search, setSearch] = useState("");

    const handleMenuClick = (name) => {
        setAdminTab(name);
    };

    const handleNotifications = () => {
        console.log("Notificaciones");
    };

    return (
        <div className="admin-container">

            <AdminSidebar
                activeMenu="Estadísticas"
                onMenuClick={handleMenuClick}
                currentUser={currentUser}
                handleLogout={handleLogout}
            />

            <main className="admin-main">

                <AdminTopbar
                    activeMenu="Estadísticas"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                <section className="content">

                    <div className="content-header">
                        <div>
                            <h1>Estadísticas</h1>

                            <p>
                                Consulta las estadísticas y métricas
                                generales de la plataforma.
                            </p>
                        </div>
                    </div>

                    <div className="admin-card">

                        <div className="empty-state">

                            <div className="empty-icon">
                                📊
                            </div>

                            <h3>
                                Estadísticas
                            </h3>

                            <p>
                                Aquí podrás consultar las métricas
                                de usuarios, postulaciones y vacantes.
                            </p>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Estadisticas;