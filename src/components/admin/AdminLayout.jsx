import React from "react";

import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

import "../../styles/admin/admin-layout.css";
import "../../styles/admin/admin-sidebar.css";
import "../../styles/admin/admin-topbar.css";

function AdminLayout({
    activeMenu,
    onMenuClick,
    children,
    currentUser,
    handleLogout
}) {

    return (
        <div className="admin-layout">

            {/* SIDEBAR */}
            <AdminSidebar
                activeMenu={activeMenu}
                onMenuClick={onMenuClick}
            />

            {/* CONTENIDO DERECHO */}
            <div className="admin-main">

                {/* TOPBAR */}
                <AdminTopbar
                    currentUser={currentUser}
                    handleLogout={handleLogout}
                />

                {/* VISTA ACTUAL */}
                <main className="admin-content">
                    {children}
                </main>

            </div>

        </div>
    );
}

export default AdminLayout;