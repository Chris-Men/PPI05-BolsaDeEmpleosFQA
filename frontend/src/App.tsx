import { useEffect, useRef, useState, useCallback } from 'react';
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
import { clearSavedIntent, getSavedIntent, setSavedIntent } from './utils/savedIntent';
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

    if (
        session?.roles.some(
            (role) =>
                role === 'SUPER_ADMIN' ||
                role === 'ADMINISTRATOR'
        )
    ) {
        return (
            <AuthenticatedDashboard
                key={session.userId}
            />
        );
    }

    return (
        <PublicApp
            key={session?.userId ?? 'anonymous'}
        />
    );
}


/** Keeps public navigation, candidate profile, and applications scoped to one account. */
function PublicApp() {
    const { session, logout } = useAuth();
    const savedState = useSavedOpportunities(session);
    const { canUpdate: savedCanUpdate, loading: savedLoading, total: savedTotal, error: savedError, change: changeSaved } = savedState;
    const [pendingSaveIntent, setPendingSaveIntent] = useState(getSavedIntent);
    const [saveIntentError, setSaveIntentError] = useState('');
    const [saveIntentRetry, setSaveIntentRetry] = useState(0);
    const attemptedSaveIntent = useRef<string | null>(null);


    // ==========================================================
    // NAVEGACIÓN GLOBAL
    // ==========================================================

    const getInitialScreen = (): ScreenName => {
        const path = window.location.pathname;

        if (
            path === '/reset-password' &&
            new URLSearchParams(
                window.location.search
            ).has('token')
        ) {
            return 'reset-password';
        }

        if (path === '/forgot-password') {
            return 'forgot-password';
        }

        if (getSavedIntent()) return session ? 'profile' : 'login';
        const params = new URLSearchParams(window.location.search);
        if (/^(job|volunteer)-[1-9][0-9]*$/.test(params.get('postular') ?? '')) return 'form';
        if (/^[1-9][0-9]*$/.test(params.get('postulacion') ?? '')) return 'profile';
        return 'home';
    };


    const [screen, setScreen] =
        useState<ScreenName>(
            getInitialScreen()
        );


    const [screenHistory, setScreenHistory] =
        useState<ScreenName[]>([]);


    const currentUser: CurrentUser | null =
        session?.roles.includes('CANDIDATE')
            ? {
                email: session.user.email,
                role: 'candidate',
                name: session.user.fullName,
                initial:
                    session.user.fullName
                        .charAt(0)
                        .toUpperCase(),
            }
            : null;

    const candidateState = useCandidateProfile(Boolean(currentUser));
    const beforeApplicationLeave = useRef<(() => Promise<unknown>) | null>(null);
    const registerApplicationGuard = useCallback((save: (() => Promise<unknown>) | null): void => { beforeApplicationLeave.current = save; }, []);


    // ==========================================================
    // DATOS
    // ==========================================================






    const volunteerApps: number[] = [];
    const studentApps: number[] = [];
    const [activeStudentTab, setActiveStudentTab] =
        useState<StudentOpportunityType>(
            'social'
        );


    // ==========================================================
    // MENÚ DEL USUARIO
    // ==========================================================

    const [userMenuOpen, setUserMenuOpen] =
        useState(false);
    const [notificationsRequest, setNotificationsRequest] = useState(0);


    // ==========================================================
    // SELECCIONES
    // ==========================================================

    const [selectedJob, setSelectedJob] =
        useState<Job | null>(null);
    const [detailError, setDetailError] = useState('');
    const detailRequest = useRef(0);
    useEffect(() => () => { detailRequest.current += 1; }, []);





    const [applicationKey, setApplicationKey] = useState<string | null>(new URLSearchParams(window.location.search).get('postular'));
    const [submittedApplication, setSubmittedApplication] = useState<Application | null>(null);

    // ==========================================================
    // QUICK VIEW
    // ==========================================================

    const [qvOpen, setQvOpen] =
        useState(false);


    const [qvJob, setQvJob] =
        useState<Job | null>(null);


    // ==========================================================
    // BÚSQUEDA / FILTROS
    // ==========================================================

    const [searchQuery, setSearchQuery] =
        useState('');


    const [searchLocation, setSearchLocation] =
        useState('Todo el país');


    const [selectedArea, setSelectedArea] =
        useState('Todos');


    const [maxSalary, setMaxSalary] =
        useState(1500);
    const dictionaries = useOpportunityCatalogs();
    const [publicDetail, setPublicDetail] = useState<Opportunity | null>(null);
    const [publicDetailError, setPublicDetailError] = useState('');
    const [publicDetailLoading, setPublicDetailLoading] = useState(false);
    const publicDetailRequest = useRef(0);
    useEffect(() => () => { publicDetailRequest.current += 1; }, []);
    const viewOpportunity = (key: string): void => {
        const requestId = ++publicDetailRequest.current;
        setPublicDetailError(''); setPublicDetailLoading(true);
        void getOpportunity(key).then((value) => { if (publicDetailRequest.current === requestId) setPublicDetail(value); })
            .catch((failure: unknown) => { if (publicDetailRequest.current === requestId) setPublicDetailError(failure instanceof Error ? failure.message : 'La oportunidad no está disponible.'); })
            .finally(() => { if (publicDetailRequest.current === requestId) setPublicDetailLoading(false); });
    };
    const kind: OpportunityKind = screen === 'volunteers' ? 'VOLUNTEER' : screen === 'students' ? (activeStudentTab === 'social' ? 'SOCIAL_HOURS' : 'INTERNSHIP') : 'EMPLOYMENT';
    const filterIdentity = JSON.stringify([kind, searchQuery, searchLocation, selectedArea, maxSalary]);
    const [pagination, setPagination] = useState({ identity: '', page: 1 });
    const publicPage = pagination.identity === filterIdentity ? pagination.page : 1;
    const category = dictionaries.catalogs?.categories.find((item) => item.name === selectedArea);
    const listing = useOpportunityListing({ kind, page: publicPage, pageSize: 20,
        search: searchQuery || undefined, location: ['Todo el país', 'Remoto'].includes(searchLocation) ? undefined : searchLocation,
        modality: searchLocation === 'Remoto' ? 'REMOTE' : undefined,
        categoryId: category?.id, salaryMax: kind === 'EMPLOYMENT' && maxSalary < 1500 ? maxSalary : undefined,
    }, screen !== 'home');
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
    const navigateTo = (
        nextScreen: ScreenName,
        data: Job | null = null,
        showNotifications = false
    ) => {
        if (screen === 'form' && nextScreen !== 'form' && beforeApplicationLeave.current) {
            void beforeApplicationLeave.current().then(() => { beforeApplicationLeave.current = null; navigateTo(nextScreen, data, showNotifications); }).catch(() => undefined);
            return;
        }
        const requestId = ++detailRequest.current;
        publicDetailRequest.current += 1; setPublicDetail(null); setPublicDetailLoading(false); setPublicDetailError('');
        if (!['form', 'login', 'register', 'forgot-password'].includes(nextScreen)) {
            const url = new URL(window.location.href); url.searchParams.delete('postular');
            if (nextScreen !== 'profile' || showNotifications) url.searchParams.delete('postulacion');
            window.history.replaceState(null, '', url);
        }

        setScreenHistory(prev => [
            ...prev,
            screen
        ]);


        setScreen(nextScreen);
        if (nextScreen === 'profile') setNotificationsRequest(value => showNotifications ? value + 1 : 0);


        if (
            data &&
            nextScreen === 'detail'
        ) {
            setSelectedJob(null); setDetailError('');
            if (data.opportunityKey) {
                void getOpportunity(data.opportunityKey).then((value) => {
                    if (detailRequest.current !== requestId) return;
                    const fresh = opportunityToJob(value); setSelectedJob(fresh);
                }).catch((failure: unknown) => {
                    if (detailRequest.current === requestId) setDetailError(failure instanceof Error ? failure.message : 'La vacante no está disponible.');
                });
            }

        }


        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };


    const goBack = () => {
        if (screen === 'form' && beforeApplicationLeave.current) {
            void beforeApplicationLeave.current().then(() => { beforeApplicationLeave.current = null; goBack(); }).catch(() => undefined);
            return;
        }
        detailRequest.current += 1;

        if (screenHistory.length > 0) {

            const previousScreen =
                screenHistory[
                    screenHistory.length - 1
                ];


            setScreenHistory(prev =>
                prev.slice(0, -1)
            );


            setScreen(previousScreen);

        } else {

            setScreen('home');

        }
    };


    // ==========================================================
    // TOAST
    // ==========================================================

    const showToast = useCallback((msg: string) => {

        setToastMsg(msg);
        setToastShow(true);

    }, []);

    /** Commits Home's draft filters only when navigating to employment results. */
    const searchFromHome = (query: string, location: string, area = 'Todos'): void => {
        setSearchQuery(query.trim());
        setSearchLocation(location);
        setSelectedArea(area);
        setMaxSalary(1500);
        setPagination({ identity: '', page: 1 });
        navigateTo('jobs');
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

        void logout().catch(
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
        setSavedIntent(key); setPendingSaveIntent(key); navigateTo('login');
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
                clearSavedIntent(); setPendingSaveIntent(null); setScreen('profile');
                showToast('Vacante guardada en tu perfil.');
            }).catch((failure: unknown) => {
                if (sessionStore.getSnapshot().session?.userId === userId)
                    setSaveIntentError(failure instanceof Error ? failure.message : 'No se pudo guardar la vacante.');
            });
        }, 0);
        return () => clearTimeout(timer);
    }, [session?.userId, pendingSaveIntent, savedCanUpdate, savedLoading, savedTotal, savedError, changeSaved, saveIntentRetry, showToast]);

    // ==========================================================
    // POSTULACIONES
    // ==========================================================

    /** Preserves the vacancy in a public URL through login, registration and reload. */
    const openApplication = (key: string): void => {
        const url = new URL(window.location.href); url.searchParams.set('postular', key); url.searchParams.delete('postulacion');
        window.history.replaceState(null, '', url);
        setApplicationKey(key); setQvOpen(false); setPublicDetail(null);
        setScreenHistory(previous => [...previous, screen]); setScreen('form'); window.scrollTo({top:0,behavior:'smooth'});
    };
    const handleVolunteerApplyClick = (spot: VolunteerSpot) => openApplication(spot.opportunityKey ?? 'volunteer-'+spot.id);
    const handleStudentApplyClick = (spot: StudentSpot) => openApplication(spot.opportunityKey ?? 'job-'+spot.id);
    const handleSubmittedApplication = (value: Application): void => { beforeApplicationLeave.current = null; setSubmittedApplication(value); navigateTo('confirm'); };
    const viewSubmittedApplication = (): void => {
        if (!submittedApplication) return;
        const url = new URL(window.location.href); url.searchParams.set('postulacion', String(submittedApplication.id));
        window.history.replaceState(null, '', url); navigateTo('profile');
    };

    // ==========================================================
    // FILTROS
    // ==========================================================

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
            setSearchQuery('');
            setSearchLocation('Todo el país');
            setSelectedArea('Todos');
            setMaxSalary(1500);
            showToast('Filtros reiniciados');
        },
        total: listing.page.total,
        page: publicPage,
        pageSize: listing.page.pageSize,
        onPageChange: (page) => setPagination({ identity: filterIdentity, page }),
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
                                Mi perfil de candidato
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
                {screen === 'detail' && !selectedJob && <div className="vacancy-status"><p role={detailError ? 'alert' : 'status'}>{detailError || 'Cargando vacante…'}</p>{detailError && <button type="button" onClick={() => navigateTo('jobs')}>Volver a las vacantes</button>}</div>}
                {publicDetailLoading && <p className="vacancy-status" role="status">Cargando oportunidad…</p>}
                {publicDetailError && <p className="vacancy-status" role="alert">{publicDetailError}</p>}
                {publicDetail && <OpportunityDetailsDialog opportunity={publicDetail} onClose={() => setPublicDetail(null)} />}


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

                {screen === 'profile' && (

                    <CandidateProfile
                        currentUser={currentUser}
                        onViewOpportunity={viewOpportunity}
                        handleLogout={handleLogout}
                        onResume={openApplication}
                        navigateTo={navigateTo}
                        candidateState={candidateState}
                        notificationsRequest={notificationsRequest}
                    />

                )}

            </div>


            {/* ======================================================
                QUICK VIEW
            ====================================================== */}

            {qvOpen && qvJob && (

                <div
                    id="qv-overlay"
                    onClick={() =>
                        setQvOpen(false)
                    }
                >

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

                            <button
                                className="qv-apply"
                                onClick={() => {

                                    setQvOpen(
                                        false
                                    );

                                    openApplication(qvJob.opportunityKey ?? 'job-'+qvJob.id);

                                }}
                            >
                                Aplicar ahora →
                            </button>


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

                </div>

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
