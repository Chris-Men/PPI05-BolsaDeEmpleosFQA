
import { useState } from 'react';

import type {
    CandidateApplication,
    Job,
    StateSetter,
} from '../../types/models';

import type {
    AdminIdentity,
    AdminMenuName,
} from '../../types/admin';


import type { SiteConfiguration } from '../../config/siteConfiguration';

import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminTopbar from '../../components/admin/AdminTopbar';

import '../../styles/admin/admin-layout.css';
import '../../styles/admin/admin-sidebar.css';
import '../../styles/admin/admin-topbar.css';
import '../../styles/admin/dashboard.css';

import OpportunityManagement from './OpportunityManagement';

import CVrecibidos from './CVrecibidos';
import Organizaciones from './Organizaciones';
import Categorias from './Categorias';
import Estadisticas from './Estadisticas';
import Users from './Users';
import Configuracion from './Configuracion';


// =========================================================
// TIPOS
// =========================================================

interface DashboardJob extends Job {
    status?: string;
    draft?: boolean;
    deadline?: string;
}

interface AdminDashboardProps {
    currentUser: AdminIdentity | null;

    handleLogout: () => void;

    jobs?: DashboardJob[];
    vacancyTotal?: number;
    onVacanciesChanged?: () => void;

    applications?: CandidateApplication[];

    configuration: SiteConfiguration;

    setConfiguration: StateSetter<SiteConfiguration>;

    resetConfiguration?: () => void;
}


// =========================================================
// COMPONENTE
// =========================================================

function AdminDashboard({
    currentUser,
    handleLogout,

    jobs = [],
    vacancyTotal,
    onVacanciesChanged,

    applications = [],

    configuration,
    setConfiguration,
    resetConfiguration,
}: AdminDashboardProps) {

    // =========================================================
    // ESTADOS
    // =========================================================

    const [activeMenu, setActiveMenu] =
        useState<AdminMenuName>('Dashboard');

    const [menuHistory, setMenuHistory] =
        useState<AdminMenuName[]>([]);

    const [search, setSearch] =
        useState('');




    // =========================================================
    // ESTADÍSTICAS
    // =========================================================
    //
    // IMPORTANTE:
    // Las estadísticas ya NO utilizan useEffect ni setState.
    // Esto evita el ciclo:
    //
    // render → useEffect → setStats → render → useEffect...
    //
    // Los valores se calculan directamente desde las props.
    // =========================================================

    const stats = {
        vacantes: vacancyTotal ?? '—',
        cvs: applications.length,
        empresas: 18,
        usuarios: 4,
    };


    // =========================================================
    // NAVEGACIÓN
    // =========================================================

    const navegarA = (nombre: AdminMenuName) => {

        if (!nombre) {
            return;
        }

        if (nombre === activeMenu) {
            return;
        }

        setMenuHistory((historialAnterior) => [
            ...historialAnterior,
            activeMenu,
        ]);

        setActiveMenu(nombre);

        setSearch('');
    };


    const handleMenuClick = (name: AdminMenuName) => {
        navegarA(name);
    };


    // =========================================================
    // REGRESAR
    // =========================================================

    const handleBack = () => {

        if (menuHistory.length === 0) {

            setActiveMenu('Dashboard');

            setSearch('');

            return;
        }

        const historialAnterior = [
            ...menuHistory,
        ];

        const previousScreen =
            historialAnterior.pop();

        setMenuHistory(historialAnterior);

        setActiveMenu(
            previousScreen ?? 'Dashboard'
        );

        setSearch('');
    };


    const renderDashboard = () => {

        const vacantesActividad =
            jobs
                .slice(0, 10)
                .map((job) => ({
                    id: job.opportunityKey ?? String(job.id),

                    puesto:
                        job.title ||
                        'Sin título',

                    empresa:
                        job.org ||
                        'Sin organización',

                    estado:
                        job.status ||
                        'Activa',

                    candidatos: '—',
                }));


        const filteredVacantes =
            vacantesActividad.filter(
                (item) =>
                    `${item.puesto} ${item.empresa} ${item.estado} ${item.candidatos}`
                        .toLowerCase()
                        .includes(
                            search.toLowerCase()
                        )
            );


        return (
            <>
                {/* =================================================
                    TARJETAS
                ================================================= */}

                <div className="cards">

                    {/* VACANTES */}

                    <div className="card">

                        <span>
                            Vacantes
                        </span>

                        <h2>
                            {stats.vacantes}
                        </h2>

                        <span className="card-detail">
                            Vacantes registradas
                        </span>

                    </div>


                    {/* CV */}

                    <div className="card">

                        <span>
                            CV recibidos
                        </span>

                        <h2>
                            {stats.cvs}
                        </h2>

                        <span className="card-detail">
                            Postulaciones recibidas
                        </span>

                    </div>


                    {/* ORGANIZACIONES */}

                    <div className="card">

                        <span>
                            Organizaciones
                        </span>

                        <h2>
                            {stats.empresas}
                        </h2>

                        <span className="card-detail">
                            Organizaciones registradas
                        </span>

                    </div>


                    {/* USUARIOS */}

                    <div className="card">

                        <span>
                            Usuarios
                        </span>

                        <h2>
                            {stats.usuarios}
                        </h2>

                        <span className="card-detail">
                            Usuarios registrados
                        </span>

                    </div>

                </div>


                {/* =================================================
                    COLUMNAS DEL DASHBOARD
                ================================================= */}

                <div className="dashboard-grid">


                    {/* =================================================
                        VACANTES RECIENTES
                    ================================================= */}

                    <div className="table-box">

                        <div className="table-header">

                            <div>

                                <h3>
                                    Vacantes recientes
                                </h3>

                                <span className="section-description">
                                    Últimas oportunidades
                                    registradas.
                                </span>

                            </div>


                            {/* BOTÓN VER TODAS */}

                            <button
                                type="button"
                                onClick={() =>
                                    navegarA(
                                        'Administrar Vacantes'
                                    )
                                }
                            >
                                Ver todas
                            </button>

                        </div>


                        <div className="table-responsive">

                            {filteredVacantes.length ===
                                0 ? (

                                <div className="empty">
                                    No hay vacantes
                                    registradas.
                                </div>

                            ) : (

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Puesto
                                            </th>

                                            <th>
                                                Organización
                                            </th>

                                            <th>
                                                Estado
                                            </th>

                                            <th>
                                                Candidatos
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {filteredVacantes.map(
                                            (item) => (

                                                <tr
                                                    key={
                                                        item.id
                                                    }
                                                >

                                                    <td>
                                                        {
                                                            item.puesto
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            item.empresa
                                                        }
                                                    </td>

                                                    <td>

                                                        <span className="status">
                                                            {
                                                                item.estado
                                                            }
                                                        </span>

                                                    </td>

                                                    <td>
                                                        {
                                                            item.candidatos
                                                        }
                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            )}

                        </div>

                    </div>


                    {/* =================================================
                        ATENCIÓN REQUERIDA
                    ================================================= */}

                    <div className="attention-box">

                        <div className="attention-header">

                            <div>

                                <h3>
                                    Atención requerida
                                </h3>

                                <span>
                                    Resumen administrativo
                                </span>

                            </div>

                        </div>


                        <div className="attention-list">


                            {/* POSTULACIONES */}

                            <button
                                type="button"
                                className="attention-item"
                                onClick={() =>
                                    navegarA(
                                        'Administrar Vacantes'
                                    )
                                }
                            >

                                <div className="attention-number">
                                    {
                                        applications.length
                                    }
                                </div>

                                <div className="attention-content">

                                    <strong>
                                        Postulaciones
                                    </strong>

                                    <span>
                                        Revisar postulaciones
                                        recibidas.
                                    </span>

                                </div>

                                <div className="attention-arrow">
                                    →
                                </div>

                            </button>


                            {/* CV RECIBIDOS */}

                            <button
                                type="button"
                                className="attention-item"
                                onClick={() =>
                                    navegarA(
                                        'CV Recibidos'
                                    )
                                }
                            >

                                <div className="attention-number">
                                    {
                                        applications.length
                                    }
                                </div>

                                <div className="attention-content">

                                    <strong>
                                        CV recibidos
                                    </strong>

                                    <span>
                                        Revisar currículums
                                        enviados.
                                    </span>

                                </div>

                                <div className="attention-arrow">
                                    →
                                </div>

                            </button>


                            {/* NUEVA POSTULACIÓN */}

                            <button
                                type="button"
                                className="attention-item"
                                onClick={() =>
                                    navegarA(
                                        'Nueva Vacante'
                                    )
                                }
                            >

                                <div className="attention-number">
                                    +
                                </div>

                                <div className="attention-content">

                                    <strong>
                                        Nueva Vacante
                                    </strong>

                                    <span>
                                        Registrar una nueva
                                        oportunidad laboral.
                                    </span>

                                </div>

                                <div className="attention-arrow">
                                    →
                                </div>

                            </button>


                        </div>

                    </div>

                </div>
            </>
        );
    };


    // =========================================================
    // CONTENIDO SEGÚN MENÚ
    // =========================================================

    const renderContent = () => {

        switch (activeMenu) {

            case 'Dashboard':

                return renderDashboard();


            case 'Nueva Vacante':

                return (
                    <OpportunityManagement key="create" startCreating onBack={handleBack} onChanged={onVacanciesChanged} />
                );


            case 'Administrar Vacantes':

                return (
                    <OpportunityManagement key="manage" onChanged={onVacanciesChanged} />
                );


            case 'CV Recibidos':

                return (
                    <CVrecibidos
                        applications={applications}
                        jobs={jobs}
                    />
                );


            case 'Organizaciones':

                return (
                    <Organizaciones
                        search={search}
                    />
                );


            case 'Categorías':

                return (
                    <Categorias />
                );


            case 'Estadísticas':

                return (
                    <Estadisticas
                        jobs={jobs}
                        applications={applications}
                    />
                );


            case 'Usuarios':

                return (
                    <Users />
                );


            case 'Configuración':

                return (
                    <Configuracion
                        configuration={configuration}
                        setConfiguration={setConfiguration}
                        resetConfiguration={
                            resetConfiguration
                        }
                    />
                );


            default:

                return renderDashboard();
        }
    };


    // =========================================================
    // RENDER PRINCIPAL
    // =========================================================

    return (

        <div className="admin-container">

            <AdminSidebar
                activeMenu={activeMenu}
                onMenuClick={handleMenuClick}
            />


            <main className="admin-main">

                <AdminTopbar
                    activeMenu={activeMenu}
                    currentUser={currentUser}
                    handleLogout={handleLogout}
                />


                <section className="content">
                    {renderContent()}
                </section>

            </main>

        </div>
    );
}


export default AdminDashboard;
