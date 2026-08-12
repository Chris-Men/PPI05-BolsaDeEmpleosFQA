import { useState } from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function AdministrarPostulaciones({
    currentUser,
    handleLogout,
    adminTab,
    setAdminTab,
    applications = [],
    handleUpdateAppStatus,
}) {
    const [search, setSearch] = useState("");

    const handleMenuClick = (name) => {
        setAdminTab(name);
    };

    const handleNotifications = () => {
        console.log("Notificaciones");
    };

    const filteredApplications = applications.filter((app) => {
        const query = search.toLowerCase();

        return (
            app.candidateName?.toLowerCase().includes(query) ||
            app.jobTitle?.toLowerCase().includes(query) ||
            app.orgName?.toLowerCase().includes(query) ||
            app.id?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="admin-container">

            <AdminSidebar
                activeMenu="Administrar Postulaciones"
                onMenuClick={handleMenuClick}
                currentUser={currentUser}
                handleLogout={handleLogout}
            />

            <main className="admin-main">

                <AdminTopbar
                    activeMenu="Administrar Postulaciones"
                    search={search}
                    setSearch={setSearch}
                    onNotifications={handleNotifications}
                />

                <section className="content">

                    <div className="content-header">
                        <div>
                            <h1>Administrar Postulaciones</h1>
                            <p>
                                Gestiona y revisa las postulaciones recibidas.
                            </p>
                        </div>
                    </div>

                    <div className="admin-card">

                        {filteredApplications.length === 0 ? (

                            <div className="empty-state">
                                <div className="empty-icon">
                                    📄
                                </div>

                                <h3>
                                    No hay postulaciones
                                </h3>

                                <p>
                                    No se encontraron postulaciones con los
                                    criterios de búsqueda.
                                </p>
                            </div>

                        ) : (

                            <div className="table-container">

                                <table className="admin-table">

                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Candidato</th>
                                            <th>Vacante</th>
                                            <th>Organización</th>
                                            <th>Fecha</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {filteredApplications.map((app) => (

                                            <tr key={app.id}>

                                                <td>
                                                    <strong>
                                                        {app.id}
                                                    </strong>
                                                </td>

                                                <td>
                                                    <div>
                                                        <strong>
                                                            {app.candidateName}
                                                        </strong>

                                                        <small>
                                                            {app.candidateEmail}
                                                        </small>
                                                    </div>
                                                </td>

                                                <td>
                                                    {app.jobTitle}
                                                </td>

                                                <td>
                                                    {app.orgName}
                                                </td>

                                                <td>
                                                    {app.date}
                                                </td>

                                                <td>

                                                    <select
                                                        value={app.status}
                                                        onChange={(e) =>
                                                            handleUpdateAppStatus &&
                                                            handleUpdateAppStatus(
                                                                app.id,
                                                                e.target.value
                                                            )
                                                        }
                                                    >

                                                        <option value="Pendiente">
                                                            Pendiente
                                                        </option>

                                                        <option value="En revisión">
                                                            En revisión
                                                        </option>

                                                        <option value="Aceptada">
                                                            Aceptada
                                                        </option>

                                                        <option value="Rechazada">
                                                            Rechazada
                                                        </option>

                                                    </select>

                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </div>

                </section>

            </main>

        </div>
    );
}

export default AdministrarPostulaciones;