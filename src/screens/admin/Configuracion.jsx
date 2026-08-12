import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function Configuracion({
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
                activeMenu="Configuración"
                onMenuClick={handleMenuClick}
                currentUser={currentUser}
                handleLogout={handleLogout}
            />

            <main className="admin-main">

                <AdminTopbar
                    activeMenu="Configuración"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                <section className="content">

                    <div className="content-header">
                        <div>
                            <h1>Configuración</h1>

                            <p>
                                Administra las preferencias y opciones
                                generales del panel administrativo.
                            </p>
                        </div>
                    </div>

                    <div className="admin-card">

                        <div className="empty-state">

                            <div className="empty-icon">
                                ⚙️
                            </div>

                            <h3>
                                Configuración
                            </h3>

                            <p>
                                Aquí podrás administrar la configuración
                                general de la plataforma.
                            </p>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Configuracion;