import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function Organizaciones({ currentUser, handleLogout, adminTab, setAdminTab }) {
    const [search, setSearch] = useState("");

    const handleMenuClick = (name) => {
        setAdminTab(name);
    };

    const handleNotifications = () => {
        // Aquí puedes agregar posteriormente las notificaciones
    };

    return (
        <div className="admin-container">

            <AdminSidebar
                activeMenu="Organizaciones"
                onMenuClick={handleMenuClick}
            />

            <main className="admin-main">

                <AdminTopbar
                    activeMenu="Organizaciones"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                <section className="content">

                    <div className="content-header">
                        <div>
                            <h1>Organizaciones</h1>
                            <p>
                                Administra las organizaciones registradas
                                en la plataforma.
                            </p>
                        </div>
                    </div>

                    <div className="admin-card">

                        <div className="admin-card-header">
                            <div>
                                <h2>Organizaciones registradas</h2>
                                <p>
                                    Aquí aparecerán las organizaciones
                                    disponibles en el sistema.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="admin-btn-primary"
                            >
                                + Nueva organización
                            </button>
                        </div>

                        <div className="admin-empty-state">

                            <div className="admin-empty-icon">
                                🏢
                            </div>

                            <h3>
                                No hay organizaciones registradas
                            </h3>

                            <p>
                                Cuando agregues organizaciones,
                                aparecerán aquí.
                            </p>

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Organizaciones;