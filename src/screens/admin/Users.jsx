import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function Users({
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

            <AdminSidebar
                activeMenu="Usuarios"
                onMenuClick={handleMenuClick}
            />

            <main className="admin-main">

                <AdminTopbar
                    activeMenu="Usuarios"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                <section className="content">

                    <h1>Usuarios</h1>

                    <p>
                        Administración de usuarios de la plataforma.
                    </p>

                </section>

            </main>

        </div>
    );
}

export default Users;