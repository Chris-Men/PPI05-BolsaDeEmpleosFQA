
import { useState } from 'react';

import type { DashboardStatistics } from '../../types/statistics';

import type {
    AdminIdentity,
    AdminMenuName,
} from '../../types/admin';




import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminTopbar from '../../components/admin/AdminTopbar';

import '../../styles/admin/admin-layout.css';
import '../../styles/admin/admin-sidebar.css';
import '../../styles/admin/admin-topbar.css';
import '../../styles/admin/dashboard.css';

import OpportunityManagement from './OpportunityManagement';

import ApplicationManagement from './ApplicationManagement';

import { useAuth } from '../../hooks/useAuth';
import { canReadStatistics } from '../../utils/siteManagement';
import { STATUS_LABELS } from '../../types/opportunity';
import Organizaciones from './Organizaciones';
import Categorias from './Categorias';
import Estadisticas from './Estadisticas';
import Users from './Users';
import Configuracion from './Configuracion';
import Backups from './Backups';


// =========================================================
// TIPOS
// =========================================================



interface AdminDashboardProps {
    currentUser: AdminIdentity | null;

    handleLogout: () => void;

    statistics: DashboardStatistics | null;
    statisticsLoading: boolean;
    statisticsError: string;
    onReloadStatistics: () => void;
    onVacanciesChanged: () => void;
}


// =========================================================
// COMPONENTE
// =========================================================

function AdminDashboard({
    currentUser,
    handleLogout,

    statistics, statisticsLoading, statisticsError, onReloadStatistics, onVacanciesChanged,
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

    const { session } = useAuth();
    const indicators = { error: statisticsError, statistics: statistics ? { total: statistics.applications, withResume: statistics.withResume } : null, reload: onReloadStatistics };
    const stats = {
        vacantes: statistics?.opportunities ?? '—',
        cvs: statistics?.withResume ?? '—',
        empresas: statistics?.organizations ?? '—',
        usuarios: statistics?.applicants ?? '—',
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

        if (!canReadStatistics(session)) return <p role="alert">No tienes permiso para consultar estadísticas.</p>;
        const vacantesActividad = (statistics?.recentOpportunities ?? []).map(item => ({
            id: item.key, puesto: item.title, empresa: item.organization, estado: STATUS_LABELS[item.status], candidatos: item.candidates,
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
                {statisticsLoading && <p role="status">Cargando indicadores…</p>}
                {statisticsError && <p role="alert" className="statistics-error">{statisticsError} <button type="button" onClick={onReloadStatistics}>Reintentar indicadores</button></p>}
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
                            Postulaciones con CV
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
                            Candidatos postulantes
                        </span>

                        <h2>
                            {stats.usuarios}
                        </h2>

                        <span className="card-detail">
                            Candidatos con postulaciones
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
                                    {statisticsLoading ? 'Cargando vacantes…' : statisticsError ? 'No se pudieron consultar las vacantes.' : search ? 'No hay coincidencias en las vacantes recientes.' : 'No hay vacantes registradas.'}
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
                                        'Postulaciones'
                                    )
                                }
                            >

                                <div className="attention-number">
                                    {
                                        indicators.error ? '—' : indicators.statistics?.total ?? '—'
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
                                        'Postulaciones'
                                    )
                                }
                            >

                                <div className="attention-number">
                                    {
                                        indicators.error ? '—' : indicators.statistics?.withResume ?? '—'
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


            case 'Postulaciones':

                return (
                    <ApplicationManagement onChanged={indicators.reload} />
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
                    <Estadisticas />
                );


            case 'Usuarios':

                return (
                    <Users />
                );


            case 'Configuración':

                return (
                    <Configuracion />
                );

            case 'Respaldos':
                return <Backups />;


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
