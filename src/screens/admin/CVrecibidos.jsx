import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function CVResividos({
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
                activeMenu="CV Resividos"
                onMenuClick={handleMenuClick}
                currentUser={currentUser}
                handleLogout={handleLogout}
            />

            <main className="admin-main">

                <AdminTopbar
                    activeMenu="CV Resividos"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                <section className="content">

                    <div className="content-header">
                        <div>
                            <h1>CV Resividos</h1>

                            <p>
                                Consulta y administra los currículums
                                recibidos de los candidatos.
                            </p>
                        </div>
                    </div>

                    <div className="admin-card">

                        <div className="empty-state">

                            <div className="empty-icon">
                                📄
                            </div>

                            <h3>
                                CV resividos
                            </h3>

                            <p>
                                Aquí aparecerán los currículums
                                enviados por los candidatos.
                            </p>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default CVResividos;