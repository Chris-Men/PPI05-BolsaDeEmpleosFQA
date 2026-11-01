import { QuickViewDialog } from './components/QuickViewDialog';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigate } from 'react-router';
import { useNavigation } from './hooks/useNavigation';
import { useRouteQuery } from './hooks/useRouteQuery';
import { authenticationDestination, isAdministrator, isCandidate, legacyDestination, opportunityPath, screenPaths } from './utils/routes';
import { getApplication } from './services/applicationService';
import { AccountProfile } from './screens/AccountProfile';
import { useOpportunityListing, useOpportunityCatalogs, useHomeStatistics } from './hooks/useOpportunities';
import { getOpportunity } from './services/opportunityService';
import { opportunityToJob, opportunityToVolunteer, opportunityToStudent } from './utils/opportunityPresentation';
import type { OpportunityKind } from './types/opportunity';
import type { Opportunity } from './types/opportunity';
import { OpportunityDetailsDialog } from './components/OpportunityDetailsDialog';
import type { OpportunityListingControls } from './components/OpportunityListingLayout';
import './styles/admin/vacancies.css';
import type {
    CurrentUser,
    Job,
    ScreenName,
    StudentOpportunityType,
    StudentSpot,
    VolunteerSpot,
} from './types/models';

import { useAuth } from './hooks/useAuth';
import { useSavedOpportunities } from './hooks/useSavedOpportunities';
import { SavedOpportunitiesContext } from './state/savedOpportunitiesContext';
import { clearSavedIntent, getSavedIntent } from './utils/savedIntent';
import { sessionStore } from './services/sessionStore';
import './styles/users/savedOpportunities.css';
import { useCandidateProfile } from './hooks/useCandidateProfile';
import type { Application } from './types/application';
import { AuthenticatedDashboard } from './components/admin/AuthenticatedDashboard';
import Home from './screens/Home';
import JobsListing from './screens/JobsListing';
import JobDetail from './screens/JobDetail';
import { ApplicationForm } from './screens/ApplicationForm';
import { ApplicationConfirmation } from './screens/ApplicationConfirmation';
import Volunteers from './screens/Volunteers';
import Students from './screens/student';
import Nosotros from './screens/Nosotros';
import Help from './screens/Help';
import CandidateProfile from './screens/CandidateProfile';

import Login from './screens/auth/Login';
import Register from './screens/auth/Register';
import ForgotPassword from './screens/auth/ForgotPassword';
import ResetPassword from './screens/auth/ResetPassword';
import Collaborators from "./screens/collaborators";

// ============================================================
// COMPONENTES
// ============================================================

import Navbar from './components/users/navbar';


// ============================================================
// DATOS INICIALES
// ============================================================

/** Remounts account-scoped state whenever the real identity changes. */
export default function App() {
    const { status, session, error, retry } = useAuth();
    const { route, location, go } = useNavigation();

    if (status === 'loading') {
        return (
            <main
                className="session-status"
                role="status"
            >
                Verificando sesión…
            </main>
        );
    }

    if (status === 'error') {
        return (
            <main className="session-status">
                <p role="alert">
                    {error}
                </p>

                <button
                    type="button"
                    onClick={() => void retry()}
                >
                    Reintentar
                </button>
            </main>
        );
    }

    const legacy = legacyDestination(location.pathname, location.search);
    if (legacy) return <Navigate to={legacy} replace />;
    if (route.requiresAccount && !session) {
        const params = new URLSearchParams({ returnTo: location.pathname + location.search });
        const saved = new URLSearchParams(location.search).get('guardar'); if (saved) params.set('guardar', saved);
        return <Navigate to={'/login?' + params} replace />;
    }
    if (route.adminMenu && !isAdministrator(session) || route.candidateOnly && !isCandidate(session)) {
        return <main className="session-status"><h1>Acceso no autorizado</h1><p>No tienes permiso para acceder a esta sección.</p><button onClick={() => go(session ? '/perfil' : '/')}>Volver</button></main>;
    }
    if (['login', 'register'].includes(route.screen) && session) return <Navigate to={authenticationDestination(location.search, session)} replace />;
    if (route.adminMenu) return <AuthenticatedDashboard key={session?.userId} />;

    return (
        <PublicApp
            key={session?.userId ?? 'anonymous'}
        />
    );
}


/** Keeps public navigation, candidate profile, and applications scoped to one account. */
function PublicApp() {
    const { session, logout } = useAuth();
    const { route, location, go, back, run } = useNavigation();
    const screen = route.screen;
    const savedState = useSavedOpportunities(session);
    const { canUpdate: savedCanUpdate, loading: savedLoading, total: savedTotal, error: savedError, change: changeSaved } = savedState;
    const [pendingSaveIntent, setPendingSaveIntent] = useState(getSavedIntent);
    useEffect(() => { setPendingSaveIntent(getSavedIntent()); }, [location.search]);
    const [saveIntentError, setSaveIntentError] = useState('');
    const [saveIntentRetry, setSaveIntentRetry] = useState(0);
    const attemptedSaveIntent = useRef<string | null>(null);


    // ==========================================================
    // NAVEGACIÓN GLOBAL
    // ==========================================================

    const currentUser: CurrentUser | null = session ? {
        email: session.user.email, role: session.roles.includes('SUPER_ADMIN') ? 'super-admin' : isAdministrator(session) ? 'administrator' : 'candidate',
        name: session.user.fullName, initial: session.user.fullName.charAt(0).toUpperCase(),
    } : null;

    const candidateState = useCandidateProfile(isCandidate(session));
    const beforeApplicationLeave = useRef<(() => Promise<unknown>) | null>(null);
    const registerApplicationGuard = useCallback((save: (() => Promise<unknown>) | null): void => { beforeApplicationLeave.current = save; }, []);


    // ==========================================================
    // DATOS
    // ==========================================================






    const volunteerApps: number[] = [];
    const studentApps: number[] = [];
    const activeStudentTab: StudentOpportunityType = route.kind === 'INTERNSHIP' ? 'practica' : 'social';
    const setActiveStudentTab = (update: StudentOpportunityType | ((previous: StudentOpportunityType) => StudentOpportunityType)): void => {
        const next = typeof update === 'function' ? update(activeStudentTab) : update;
        go(next === 'practica' ? '/estudiantes/practicas' : '/estudiantes/horas-sociales');
    };

    const [userMenuOpen, setUserMenuOpen] =
        useState(false);


    // ==========================================================
    // SELECCIONES
    // ==========================================================

    const [selectedJob, setSelectedJob] =
        useState<Job | null>(null);
    const [detailError, setDetailError] = useState('');





    const applicationKey = screen === 'form' ? route.opportunityKey ?? null : null;
    const [submittedApplication, setSubmittedApplication] = useState<Application | null>(null);

    // ==========================================================
    // QUICK VIEW
    // ==========================================================

    const preview = new URLSearchParams(location.search).get('preview');
    const qvOpen = Boolean(preview);
    const [qvJob, storeQvJob] = useState<Job | null>(null);
    const qvSelection = useRef<Job | null>(null);
    const setQvJob: React.Dispatch<React.SetStateAction<Job | null>> = update => {
      const next = typeof update === 'function' ? update(qvSelection.current) : update;
      qvSelection.current = next; storeQvJob(next);
    };
    const setQvOpen: React.Dispatch<React.SetStateAction<boolean>> = update => {
      const open = typeof update === 'function' ? update(qvOpen) : update;
      const params = new URLSearchParams(location.search); params.delete('preview');
      const base = location.pathname + (params.size ? '?' + params : '');
      if (!open) { back(base); return; }
      if (qvSelection.current) { params.set('preview', qvSelection.current.opportunityKey ?? 'job-' + qvSelection.current.id); go(location.pathname + '?' + params); }
    };
    useEffect(() => {
      if (!preview) return;
      let active = true; storeQvJob(null);
      void getOpportunity(preview).then(value => { if (active) storeQvJob(opportunityToJob(value)); })
        .catch((failure: unknown) => { if (active) setDetailError(failure instanceof Error ? failure.message : 'No se pudo cargar la vista rápida.'); });
      return () => { active = false; };
    }, [preview]);


    // ==========================================================
    // BÚSQUEDA / FILTROS
    // ==========================================================

    const [publicFilters, setPublicFilters, correctPublicFilters] = useRouteQuery<{
        search: string; location: string; modality?: string; categoryId?: number; salaryMax: number; page: number; pageSize: number;
    }>({ search: '', location: '', modality: undefined, categoryId: undefined, salaryMax: 1500, page: 1, pageSize:20 }, {
        pageSize:{max:100}, search: { maxLength: 150 }, modality: { choices: ['REMOTE', 'ON_SITE', 'HYBRID'] }, categoryId: { type: 'integer' }, salaryMax: { type: 'number', min: 0 },
    }, ['jobs','detail','volunteers','students'].includes(screen));
    const dictionaries = useOpportunityCatalogs();
    const searchQuery = publicFilters.search;
    const searchLocation = publicFilters.modality === 'REMOTE' ? 'Remoto' : publicFilters.location || 'Todo el país';
    const selectedArea = dictionaries.catalogs?.categories.find(item => item.id === publicFilters.categoryId)?.name ?? 'Todos';
    const maxSalary = publicFilters.salaryMax;
    const setSearchQuery = (search: string) => setPublicFilters(previous => ({ ...previous, search, page: 1 }));
    const setSearchLocation = (location: string) => setPublicFilters(previous => ({ ...previous,
        location: ['Todo el país', 'Remoto'].includes(location) ? '' : location, modality: location === 'Remoto' ? 'REMOTE' : undefined, page: 1 }));
    const setSelectedArea = (name: string) => setPublicFilters(previous => ({ ...previous, categoryId: dictionaries.catalogs?.categories.find(item => item.name === name)?.id, page: 1 }));
    const setMaxSalary = (update: number | ((previous: number) => number)) => setPublicFilters(previous => ({ ...previous,
        salaryMax: typeof update === 'function' ? update(previous.salaryMax) : update, page: 1 }));
    const [publicDetail, setPublicDetail] = useState<Opportunity | null>(null);
    const [publicDetailError, setPublicDetailError] = useState('');
    const [publicDetailLoading, setPublicDetailLoading] = useState(false);
    const publicDetailRequest = useRef(0);
    useEffect(() => () => { publicDetailRequest.current += 1; }, []);
    const viewOpportunity = (key: string): void => {
        const requestId = ++publicDetailRequest.current; setPublicDetailError(''); setPublicDetailLoading(true);
        void getOpportunity(key).then(value => { if (publicDetailRequest.current === requestId) go(opportunityPath(value.kind, key) + (location.pathname === opportunityPath(value.kind) ? location.search : '')); })
            .catch((failure: unknown) => { if (publicDetailRequest.current === requestId) setPublicDetailError(failure instanceof Error ? failure.message : 'La oportunidad no está disponible.'); })
            .finally(() => { if (publicDetailRequest.current === requestId) setPublicDetailLoading(false); });
    };
    const kind: OpportunityKind = route.kind ?? (screen === 'volunteers' ? 'VOLUNTEER' : 'EMPLOYMENT');
    const publicPage = publicFilters.page;
    useEffect(() => {
        setSelectedJob(null); setPublicDetail(null); setDetailError(''); setPublicDetailError('');
        if (!route.opportunityKey || screen === 'form') return;
        let active = true; setPublicDetailLoading(true);
        void getOpportunity(route.opportunityKey).then(value => {
            if (!active) return;
            const path = opportunityPath(value.kind, value.key);
            if (path !== location.pathname) { go(path + location.search, true); return; }
            if (value.kind === 'EMPLOYMENT') setSelectedJob(opportunityToJob(value)); else setPublicDetail(value);
        }).catch((failure: unknown) => { if (active) { const message = failure instanceof Error ? failure.message : 'La oportunidad no está disponible.'; setDetailError(message); setPublicDetailError(message); } })
            .finally(() => { if (active) setPublicDetailLoading(false); });
        return () => { active = false; };
    }, [route.opportunityKey, screen, location.pathname, location.search, go]);
    useEffect(() => {
        if (screen !== 'confirm' || !route.applicationId) return;
        let active = true; setSubmittedApplication(null); setDetailError('');
        void getApplication(route.applicationId).then(value => { if (active) setSubmittedApplication(value); })
            .catch((failure: unknown) => { if (active) setDetailError(failure instanceof Error ? failure.message : 'No se encontró tu postulación.'); });
        return () => { active = false; };
    }, [screen, route.applicationId]);
    const listing = useOpportunityListing({ kind, page: publicPage, pageSize: publicFilters.pageSize,
        search: searchQuery || undefined, location: ['Todo el país', 'Remoto'].includes(searchLocation) ? undefined : searchLocation,
        modality: publicFilters.modality as Opportunity['modality'] | undefined,
        categoryId: publicFilters.categoryId, salaryMax: kind === 'EMPLOYMENT' && maxSalary < 1500 ? maxSalary : undefined,
    }, ['jobs','detail','volunteers','students'].includes(screen));
    useEffect(() => {
        if (!['jobs','volunteers','students'].includes(screen) || listing.loading || listing.error) return;
        const lastPage = Math.max(1, Math.ceil(listing.page.total / listing.page.pageSize));
        if (publicPage > lastPage) correctPublicFilters({ ...publicFilters, page: lastPage });
    }, [screen, listing.loading, listing.error, listing.page.total, listing.page.pageSize, publicPage, publicFilters, correctPublicFilters]);
    const homeListing = useOpportunityListing({ kind: 'EMPLOYMENT', page: 1, pageSize: 6 }, screen === 'home');
    const homeStatistics = useHomeStatistics(screen === 'home');
    const jobs = (screen === 'home' ? homeListing.page.items : listing.page.items).filter((item) => item.kind === 'EMPLOYMENT').map(opportunityToJob);
    const volunteerSpots = listing.page.items.filter((item) => item.kind === 'VOLUNTEER').map(opportunityToVolunteer);
    const studentSpots = listing.page.items.filter((item) => item.kind === 'SOCIAL_HOURS' || item.kind === 'INTERNSHIP').map(opportunityToStudent);


    // ==========================================================
    // TOAST
    // ==========================================================

    const [toastMsg, setToastMsg] =
        useState('');


    const [toastShow, setToastShow] =
        useState(false);


    // ==========================================================
    // NAVEGACIÓN
    // ==========================================================

    /** Saves application drafts before leaving; header requests can select the notifications tab. */
    const navigateTo = (nextScreen: ScreenName, data: Job | null = null, showNotifications = false): void => {
        if (['login', 'register'].includes(screen) && ['home', 'profile', 'form'].includes(nextScreen) && sessionStore.getSnapshot().session) {
            go(authenticationDestination(location.search, sessionStore.getSnapshot().session), true); return;
        }
        if (showNotifications) { go('/perfil/notificaciones'); return; }
        if (nextScreen === 'detail' && data?.opportunityKey) { go('/empleos/' + data.opportunityKey + location.search); return; }
        if (nextScreen in screenPaths) go(screenPaths[nextScreen as keyof typeof screenPaths] + (['login', 'register', 'forgot-password'].includes(nextScreen) ? location.search : ''));
        else go('/');
    };
    const goBack = (): void => back(route.parent + location.search);

    const showToast = useCallback((msg: string) => {

        setToastMsg(msg);
        setToastShow(true);

    }, []);

    /** Commits Home's draft filters only when navigating to employment results. */
    const searchFromHome = (search: string, location: string, area = 'Todos'): void => {
        const filters = new URLSearchParams();
        if (search.trim()) filters.set('search', search.trim());
        if (location === 'Remoto') filters.set('modality', 'REMOTE'); else if (location !== 'Todo el país') filters.set('location', location);
        const category = dictionaries.catalogs?.categories.find(item => item.name === area);
        if (category) filters.set('categoryId', String(category.id));
        go('/empleos' + (filters.size ? '?' + filters : ''));
    };


    useEffect(() => {

        if (!toastShow) return;


        const timer = setTimeout(() => {
            setToastShow(false);
        }, 3000);


        return () =>
            clearTimeout(timer);

    }, [toastShow]);


    // ==========================================================
    // CERRAR MENÚ DEL USUARIO
    // ==========================================================

    useEffect(() => {

        if (!userMenuOpen) return;


        const closeMenu = () =>
            setUserMenuOpen(false);


        document.addEventListener(
            'click',
            closeMenu
        );


        return () =>
            document.removeEventListener(
                'click',
                closeMenu
            );

    }, [userMenuOpen]);


    // ==========================================================
    // LOGOUT
    // ==========================================================

    const handleLogout = () => {

        void run(async () => { await logout(); }).then(closed => { if (closed) go('/', true); }).catch(
            (failure: unknown) => {

                showToast(
                    failure instanceof Error
                        ? failure.message
                        : 'No fue posible cerrar la sesión.'
                );

            }
        );
    };


    // ==========================================================
    // FAVORITOS
    // ==========================================================

    /** Preserves the public opportunity through candidate login or registration. */
    const requestSaveLogin = (key: string): void => {
        setPendingSaveIntent(key); go('/login?guardar=' + encodeURIComponent(key) + '&returnTo=' + encodeURIComponent('/perfil?guardar=' + key));
    };

    // A deferred start survives StrictMode replay; transport identity guards prevent cross-account retries.
    useEffect(() => {
        const userId = session?.userId;
        if (!userId || !pendingSaveIntent) return;
        if (!savedCanUpdate) { setSaveIntentError('No tienes permiso para guardar vacantes.'); return; }
        if (savedLoading || savedTotal === null || savedError) return;
        const attemptKey = userId + ':' + pendingSaveIntent + ':' + saveIntentRetry;
        if (attemptedSaveIntent.current === attemptKey) return;
        const timer = setTimeout(() => {
            attemptedSaveIntent.current = attemptKey; setSaveIntentError('');
            void changeSaved(pendingSaveIntent, true).then(() => {
                if (sessionStore.getSnapshot().session?.userId !== userId) return;
                setPendingSaveIntent(null); go('/perfil', true);
                showToast('Vacante guardada en tu perfil.');
            }).catch((failure: unknown) => {
                if (sessionStore.getSnapshot().session?.userId === userId)
                    setSaveIntentError(failure instanceof Error ? failure.message : 'No se pudo guardar la vacante.');
            });
        }, 0);
        return () => clearTimeout(timer);
    }, [session?.userId, pendingSaveIntent, savedCanUpdate, savedLoading, savedTotal, savedError, changeSaved, saveIntentRetry, showToast, go]);

    // ==========================================================
    // POSTULACIONES
    // ==========================================================

    /** Preserves the vacancy in a public URL through login, registration and reload. */
    const openApplication = (key: string): void => {
        if (session && !isCandidate(session)) { showToast('Solo los candidatos pueden postularse.'); return; }
        go('/postular/' + encodeURIComponent(key));
    };
    const handleVolunteerApplyClick = (spot: VolunteerSpot) => openApplication(spot.opportunityKey ?? 'volunteer-' + spot.id);
    const handleStudentApplyClick = (spot: StudentSpot) => openApplication(spot.opportunityKey ?? 'job-' + spot.id);
    const handleSubmittedApplication = (value: Application): void => { beforeApplicationLeave.current = null; setSubmittedApplication(value); go('/postulaciones/' + value.id + '/confirmacion', true); };
    const viewSubmittedApplication = (): void => { if (submittedApplication) go('/perfil/postulaciones/' + submittedApplication.id); };

    const filteredJobs = jobs;
    const listingControls: OpportunityListingControls = {
        categories: dictionaries.catalogs?.categories.map((item) => item.name) ?? [],
        searchQuery,
        onSearchChange: setSearchQuery,
        searchLocation,
        onLocationChange: setSearchLocation,
        selectedArea,
        onAreaChange: setSelectedArea,
        onClear: () => {
            setPublicFilters({ search: '', location: '', modality: undefined, categoryId: undefined, salaryMax: 1500, page: 1, pageSize:20 });
            showToast('Filtros reiniciados');
        },
        total: listing.page.total,
        page: publicPage,
        pageSize: listing.page.pageSize,
        onPageChange: (page) => setPublicFilters(previous => ({ ...previous, page })),
        loading: listing.loading,
        error: listing.error,
        catalogError: dictionaries.error,
        onRetry: listing.reload,
        onRetryCatalogs: dictionaries.reload,
    };


    // ==========================================================
    // LOGIN
    // ==========================================================

    if (
        screen === 'login' ||
        (
            !currentUser &&
            [
                'profile',
                'form',
                'confirm'
            ].includes(screen)
        )
    ) {

        return (
            <Login
                navigateTo={navigateTo}
            />
        );
    }


    // ==========================================================
    // REGISTRO
    // ==========================================================

    if (
        screen === 'register'
    ) {

        return (
            <Register
                navigateTo={navigateTo}
                showToast={showToast}
            />
        );
    }


    // ==========================================================
    // RECUPERACIÓN DE CONTRASEÑA
    // ==========================================================

    if (
        screen === 'forgot-password'
    ) {

        return (
            <ForgotPassword
                navigateTo={navigateTo}
            />
        );
    }


    if (
        screen === 'reset-password'
    ) {

        return (
            <ResetPassword
                navigateTo={navigateTo}
            />
        );
    }


    // ==========================================================
    // RENDER
    // ==========================================================

    return (

        <SavedOpportunitiesContext.Provider value={{ ...savedState, requestLogin: requestSaveLogin, notice: showToast }}>
        <div id="app">

            {/* ======================================================
                NAVBAR
            ====================================================== */}

            <Navbar
                screen={screen}
                currentUser={currentUser}
                userMenuOpen={userMenuOpen}
                setUserMenuOpen={setUserMenuOpen}
                navigateTo={navigateTo}
                handleLogout={handleLogout}
                onViewNotifications={() => navigateTo('profile', null, true)}
                beforeLogout={() => beforeApplicationLeave.current?.() ?? Promise.resolve()}
            />


            {savedState.error && <div role="alert" className="saved-collection-error">{savedState.error}<button type="button" onClick={savedState.reload}>Reintentar guardadas</button></div>}
            {session && pendingSaveIntent && <div className="saved-intent-notice" role={saveIntentError ? 'alert' : 'status'}>
                <p>{saveIntentError || 'Guardando la vacante seleccionada…'}</p>
                {saveIntentError && <button type="button" onClick={() => { savedState.reload(); setSaveIntentRetry(value => value + 1); }}>Reintentar guardado</button>}
                <button type="button" disabled={savedState.pending.has(pendingSaveIntent)} onClick={() => { clearSavedIntent(); setPendingSaveIntent(null); setSaveIntentError(''); }}>Cancelar guardado</button>
            </div>}

            {/* ======================================================
                BREADCRUMB
            ====================================================== */}

            {screen !== 'home' && (

                <div className="breadcrumb-row">

                    <div className="breadcrumb">

                        <span
                            onClick={() =>
                                navigateTo('home')
                            }
                        >
                            Inicio
                        </span>


                        <span className="bsep">
                            ›
                        </span>


                        {/* ================================
                            EMPLEOS
                        ================================= */}

                        {screen === 'jobs' && (

                            <span className="bcur">
                                Bolsa de Empleo
                            </span>

                        )}


                        {/* ================================
                            DETALLE
                        ================================= */}

                        {screen === 'detail' && (

                            <>

                                <span
                                    onClick={() =>
                                        navigateTo(
                                            'jobs'
                                        )
                                    }
                                >
                                    Empleos
                                </span>


                                <span className="bsep">
                                    ›
                                </span>


                                <span className="bcur">
                                    {selectedJob?.title}
                                </span>

                            </>

                        )}


                        {/* ================================
                            FORMULARIO
                        ================================= */}

                        {screen === 'form' && (

                            <>

                                <span
                                    onClick={() =>
                                        navigateTo(applicationKey?.startsWith('volunteer-') ? 'volunteers' : 'jobs')
                                    }
                                >
                                    Oportunidades
                                </span>


                                <span className="bsep">
                                    ›
                                </span>


                                <span className="bcur">
                                    Aplicar
                                </span>

                            </>

                        )}


                        {/* ================================
                            CONFIRMACIÓN
                        ================================= */}

                        {screen === 'confirm' && (

                            <span className="bcur">
                                Confirmación
                            </span>

                        )}


                        {/* ================================
                            VOLUNTARIADO
                        ================================= */}

                        {screen === 'volunteers' && (

                            <span className="bcur">
                                Voluntariados disponibles
                            </span>

                        )}


                        {/* ================================
                            ESTUDIANTES
                        ================================= */}

                        {screen === 'students' && (

                            <span className="bcur">
                                Oportunidades para Estudiantes
                            </span>

                        )}


                        {/* ================================
                            NOSOTROS
                        ================================= */}

                        {screen === 'nosotros' && (

                            <span className="bcur">
                                Nuestra misión
                            </span>

                        )}


                        {/* ================================
                            AYUDA
                        ================================= */}

                        {screen === 'help' && (

                            <span className="bcur">
                                Ayuda
                            </span>

                        )}


                        {/* ================================
                            PERFIL
                        ================================= */}

                        {screen === 'profile' && (

                            <span className="bcur">
                                Mi perfil
                            </span>

                        )}

                        {/* ================================
    COLABORADORES
================================= */}

{screen === 'collaborators' && (
    <span className="bcur">
        Colaboradores
    </span>
)}

                    </div>


                    <button
                        className="back-link-btn"
                        onClick={goBack}
                    >
                        ← Volver anterior
                    </button>

                </div>

            )}


            {/* ======================================================
                CONTENEDOR DE PANTALLAS
            ====================================================== */}

            <div className="screen-container">
                {screen === 'not-found' && <main className="session-status"><h1>Página no encontrada</h1><button onClick={() => go('/')}>Ir al inicio</button></main>}
                {screen === 'profile' && isAdministrator(session) && <AccountProfile />}
                {screen === 'confirm' && !submittedApplication && <p role={detailError ? 'alert' : 'status'}>{detailError || 'Cargando postulación…'}</p>}
                {screen === 'detail' && !selectedJob && <div className="vacancy-status"><p role={detailError ? 'alert' : 'status'}>{detailError || 'Cargando vacante…'}</p>{detailError && <button type="button" onClick={() => navigateTo('jobs')}>Volver a las vacantes</button>}</div>}
                {publicDetailLoading && <p className="vacancy-status" role="status">Cargando oportunidad…</p>}
                {publicDetailError && <p className="vacancy-status" role="alert">{publicDetailError}</p>}
                {publicDetail && <OpportunityDetailsDialog opportunity={publicDetail} onClose={() => back(route.parent + location.search)} />}


                {/* ==================================================
                    HOME
                ================================================== */}

                {screen === 'home' && (

                    <Home categories={dictionaries.catalogs?.categories.map((item) => item.name) ?? []} total={homeListing.page.total}
                        statistics={homeStatistics.statistics}
                        statisticsError={homeStatistics.error}
                        onRetryStatistics={homeStatistics.reload}
                        listingLoading={homeListing.loading}
                        listingError={homeListing.error}
                        onRetryListing={homeListing.reload}
                        onSearch={searchFromHome}
                        jobs={jobs}
                        navigateTo={
                            navigateTo
                        }
                        setQvJob={
                            setQvJob
                        }
                        setQvOpen={
                            setQvOpen
                        }
                    />

                )}

                {/* COLABORADORES */}
{screen === 'collaborators' && (
    <Collaborators />
)}


                {/* ==================================================
                    EMPLEOS
                ================================================== */}

                {screen === 'jobs' && (

                    <JobsListing listingControls={listingControls}
                        filteredJobs={
                            filteredJobs
                        }
                        selectedJob={
                            selectedJob
                        }
                        navigateTo={
                            navigateTo
                        }
                        setQvJob={
                            setQvJob
                        }
                        setQvOpen={
                            setQvOpen
                        }
                        maxSalary={
                            maxSalary
                        }
                        setMaxSalary={
                            setMaxSalary
                        }
                    />

                )}


                {/* ==================================================
                    DETALLE
                ================================================== */}

                {screen === 'detail' && selectedJob && (

                    <JobDetail
                        selectedJob={
                            selectedJob
                        }
                        onApply={() => openApplication(selectedJob.opportunityKey ?? 'job-'+selectedJob.id)}
                    />

                )}


                {/* ==================================================
                    FORMULARIO
                ================================================== */}

                {screen === 'form' && (

                    applicationKey ? <ApplicationForm key={applicationKey} opportunityKey={applicationKey} candidateState={candidateState} onSubmitted={handleSubmittedApplication} onExit={() => navigateTo('profile')} onBeforeLeave={registerApplicationGuard} /> : <div className="session-status"><p>Selecciona una vacante para iniciar tu postulación.</p><button onClick={() => navigateTo('jobs')}>Ver empleos</button></div>

                )}


                {/* ==================================================
                    CONFIRMACIÓN
                ================================================== */}

                {screen === 'confirm' && submittedApplication && (
                    <ApplicationConfirmation application={submittedApplication} onView={viewSubmittedApplication} onBrowse={() => navigateTo(submittedApplication.opportunity.kind === 'VOLUNTEER' ? 'volunteers' : 'jobs')} />

                )}


                {/* ==================================================
                    VOLUNTARIADO
                ================================================== */}

                {screen === 'volunteers' && (

                    <Volunteers
                        listingControls={listingControls}
                        volunteerSpots={
                            volunteerSpots
                        }
                        volunteerApps={
                            volunteerApps
                        }
                        onView={viewOpportunity}
                        handleVolunteerApplyClick={
                            handleVolunteerApplyClick
                        }
                    />

                )}


                {/* ==================================================
                    ESTUDIANTES
                ================================================== */}

                {screen === 'students' && (

                    <Students onView={viewOpportunity} listingControls={listingControls}
                        studentSpots={
                            studentSpots
                        }
                        studentApps={
                            studentApps
                        }
                        activeStudentTab={
                            activeStudentTab
                        }
                        setActiveStudentTab={
                            setActiveStudentTab
                        }
                        handleStudentApplyClick={
                            handleStudentApplyClick
                        }
                    />

                )}


                {/* ==================================================
                    NOSOTROS
                ================================================== */}

                {screen === 'nosotros' && (
                    <Nosotros />
                )}


                {/* ==================================================
                    AYUDA
                ================================================== */}

                {screen === 'help' && (
                    <Help navigateTo={navigateTo} />
                )}


                {/* ==================================================
                    PERFIL
                ================================================== */}

                {screen === 'profile' && !isAdministrator(session) && (

                    <CandidateProfile
                        currentUser={currentUser}
                        onViewOpportunity={viewOpportunity}
                        handleLogout={handleLogout}
                        onResume={openApplication}
                        navigateTo={navigateTo}
                        candidateState={candidateState}
                    />

                )}

            </div>


            {/* ======================================================
                QUICK VIEW
            ====================================================== */}

            {qvOpen && !qvJob && <QuickViewDialog onClose={() => setQvOpen(false)}><div id="qv-modal"><p role={detailError ? 'alert' : 'status'}>{detailError || 'Cargando vista rápida…'}</p><button type="button" onClick={() => setQvOpen(false)}>Cerrar</button></div></QuickViewDialog>}
            {qvOpen && qvJob && (

                <QuickViewDialog onClose={() => setQvOpen(false)}>
                    <div
                        id="qv-modal"
                        onClick={e =>
                            e.stopPropagation()
                        }
                    >

                        <div className="qv-header">

                            <h3>
                                {qvJob.title}
                            </h3>


                            <div className="qv-org">

                                {qvJob.org}
                                {' · '}
                                {qvJob.location}

                            </div>


                            <div className="qv-badges">

                                <span className="qv-badge">
                                    📚 {qvJob.area}
                                </span>


                                <span className="qv-badge">
                                    ⏱ {qvJob.type}
                                </span>


                                <span className="qv-badge">
                                    💰 {qvJob.salary}
                                </span>

                            </div>

                        </div>


                        <div className="qv-body">

                            <p className="qv-sec">
                                Sobre el rol
                            </p>


                            <p>
                                {qvJob.desc}
                            </p>


                            <p className="qv-sec">
                                Requisitos mínimos
                            </p>


                            <ul className="qv-list">

                                {qvJob.requirements?.map(
                                    (
                                        req,
                                        idx
                                    ) => (

                                        <li
                                            key={idx}
                                        >
                                            {req}
                                        </li>

                                    )
                                )}

                            </ul>

                        </div>


                        <div className="qv-footer">

                            {!isAdministrator(session) && <button
                                className="qv-apply"
                                onClick={() => {

                                    openApplication(qvJob.opportunityKey ?? 'job-'+qvJob.id);

                                }}
                            >
                                Aplicar ahora →
                            </button>}


                            <button
                                className="qv-close"
                                onClick={() =>
                                    setQvOpen(
                                        false
                                    )
                                }
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                </QuickViewDialog>

            )}


            {/* ======================================================
                ORGANIZACIÓN DE VOLUNTARIADO
            ====================================================== */}

            {/* ======================================================
                TOAST
            ====================================================== */}

            <div
                className={`toast ${
                    toastShow
                        ? 'show'
                        : ''
                }`}
            >

                <span>
                    ✓
                </span>


                <span>
                    {toastMsg}
                </span>

            </div>

        </div>
        </SavedOpportunitiesContext.Provider>
    );
}
