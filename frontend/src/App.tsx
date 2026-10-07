import { useEffect, useRef, useState } from 'react';
import { useOpportunityListing, useOpportunityCatalogs } from './hooks/useOpportunities';
import { getOpportunity } from './services/opportunityService';
import { opportunityToJob, opportunityToVolunteer, opportunityToStudent } from './utils/opportunityPresentation';
import type { OpportunityKind } from './types/opportunity';
import type { Opportunity } from './types/opportunity';
import { OpportunityDetailsDialog } from './components/OpportunityDetailsDialog';
import './styles/admin/vacancies.css';
import type {
    ApplicationTarget,
    CandidateApplication,
    CurrentUser,
    Job,
    ScreenName,
    StudentOpportunityType,
    StudentSpot,
    SuccessContact,
    VolunteerSpot,
} from './types/models';

import { useAuth } from './hooks/useAuth';
import { useCandidateProfile } from './hooks/useCandidateProfile';
import { profileToPersonalForm } from './utils/profileForm';
import { AuthenticatedDashboard } from './components/admin/AuthenticatedDashboard';
import Home from './screens/Home';
import JobsListing from './screens/JobsListing';
import JobDetail from './screens/JobDetail';
import FormFlow from './screens/FormFlow';
import Confirmation from './screens/Confirmation';
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

/** Remounts account-scoped demo state whenever the real identity changes. */
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


    // ==========================================================
    // DATOS
    // ==========================================================




    const [savedJobs, setSavedJobs] =
        useState<number[]>([]);


    const [applications, setApplications] =
        useState<CandidateApplication[]>([]);


    const [volunteerApps, setVolunteerApps] =
        useState<number[]>([]);


    const [studentApps, setStudentApps] =
        useState<number[]>([]);


    const [activeStudentTab, setActiveStudentTab] =
        useState<StudentOpportunityType>(
            'social'
        );


    // ==========================================================
    // MENÚ DEL USUARIO
    // ==========================================================

    const [userMenuOpen, setUserMenuOpen] =
        useState(false);


    // ==========================================================
    // SELECCIONES
    // ==========================================================

    const [selectedJob, setSelectedJob] =
        useState<Job | null>(null);
    const [detailError, setDetailError] = useState('');
    const detailRequest = useRef(0);
    useEffect(() => () => { detailRequest.current += 1; }, []);





    const [volSuccessContact, setVolSuccessContact] =
        useState<SuccessContact | null>(null);


    // ==========================================================
    // FLUJO DE POSTULACIÓN
    // ==========================================================

    const [applyFlowType, setApplyFlowType] =
        useState<
            'job' | 'volunteer' | 'student'
        >('job');


    const [applyFlowTarget, setApplyFlowTarget] =
        useState<ApplicationTarget | null>(
            null
        );


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
        search: searchQuery || undefined, location: searchLocation === 'Todo el país' ? undefined : searchLocation,
        categoryId: category?.id, salaryMax: kind === 'EMPLOYMENT' && maxSalary < 1500 ? maxSalary : undefined,
    });
    const jobs = listing.page.items.filter((item) => item.kind === 'EMPLOYMENT').map(opportunityToJob);
    const volunteerSpots = listing.page.items.filter((item) => item.kind === 'VOLUNTEER').map(opportunityToVolunteer);
    const studentSpots = listing.page.items.filter((item) => item.kind === 'SOCIAL_HOURS' || item.kind === 'INTERNSHIP').map(opportunityToStudent);


    // ==========================================================
    // FORMULARIO
    // ==========================================================

    const [formStep, setFormStep] =
        useState(1);

    const [formInitialized, setFormInitialized] =
        useState(false);


    const [formPersonal, setFormPersonal] =
        useState({
            name: currentUser?.name ?? '',
            lastname: '',
            email: currentUser?.email ?? '',
            phone: '',
            municipio: '',
            dept: '',
            level: '',
            profession: ''
        });


    const [formExp, setFormExp] =
        useState({
            lastRole: '',
            lastOrg: '',
            years: '',
            salary: '',
            motivation: '',
            skills: ''
        });


    const uploadedCVName = candidateState.resume?.originalName ?? '';

    useEffect(() => {
        if (screen !== 'form' || formInitialized || !candidateState.profile) return;
        const profile = candidateState.profile;
        setFormPersonal(profileToPersonalForm(profile));
        const experience = profile.workExperiences[0];
        setFormExp({ lastRole: experience?.position ?? '', lastOrg: experience?.companyName ?? '',
            years: '', salary: '', motivation: '', skills: profile.skills.join(', ') });
        setFormInitialized(true);
    }, [screen, formInitialized, candidateState.profile]);


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

    const navigateTo = (
        nextScreen: ScreenName,
        data: Job | null = null
    ) => {

        const requestId = ++detailRequest.current;
        publicDetailRequest.current += 1; setPublicDetail(null); setPublicDetailLoading(false); setPublicDetailError('');
        if (nextScreen === 'form') {
            setFormInitialized(false);
        }

        setScreenHistory(prev => [
            ...prev,
            screen
        ]);


        setScreen(nextScreen);


        if (
            data &&
            nextScreen === 'detail'
        ) {
            setSelectedJob(null); setDetailError('');
            if (data.opportunityKey) {
                void getOpportunity(data.opportunityKey).then((value) => {
                    if (detailRequest.current !== requestId) return;
                    const fresh = opportunityToJob(value); setSelectedJob(fresh); setApplyFlowTarget(fresh);
                }).catch((failure: unknown) => {
                    if (detailRequest.current === requestId) setDetailError(failure instanceof Error ? failure.message : 'La vacante no está disponible.');
                });
            }
            setApplyFlowType('job');
            setApplyFlowTarget(data);
        }


        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };


    const goBack = () => {
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

    const showToast = (msg: string) => {

        setToastMsg(msg);
        setToastShow(true);

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

    const toggleSaveJob = (id: number) => {

        if (savedJobs.includes(id)) {

            setSavedJobs(prev =>
                prev.filter(
                    jobId => jobId !== id
                )
            );


            showToast(
                'Vacante removida de favoritos'
            );

        } else {

            setSavedJobs(prev => [
                ...prev,
                id
            ]);


            showToast(
                '💚 Vacante guardada en tu perfil'
            );
        }
    };


    // ==========================================================
    // POSTULACIONES
    // ==========================================================

    const handleVolunteerApplyClick = (
        spot: VolunteerSpot
    ) => {

        setApplyFlowType('volunteer');

        setApplyFlowTarget(spot);

        setFormStep(1);

        navigateTo('form');
    };


    const handleStudentApplyClick = (
        spot: StudentSpot
    ) => {

        setApplyFlowType('student');

        setApplyFlowTarget(spot);

        setFormStep(1);

        navigateTo('form');
    };


    // ==========================================================
    // ENVÍO DE POSTULACIÓN
    // ==========================================================

    const handleSubmitApplication = () => {

        const target =
            applyFlowTarget;


        if (!target) return;


        if (applyFlowType === 'job') {

            const refNum =
                'FQA-2025-' +
                Math.floor(
                    Math.random() * 90000 +
                    10000
                );


            const newApp = {

                id: refNum,

                jobId: target.id,

                jobTitle: target.title,

                orgName: target.org,

                candidateName:
                    formPersonal.name +
                    ' ' +
                    formPersonal.lastname,

                candidateEmail:
                    formPersonal.email,

                phone:
                    formPersonal.phone,

                cvName:
                    uploadedCVName,

                status: 'Pendiente',

                date: 'Hoy mismo'
            };


            setApplications(prev => [
                newApp,
                ...prev
            ]);


            navigateTo('confirm');

            return;
        }


        if (
            applyFlowType ===
            'volunteer'
        ) {

            setVolunteerApps(prev => [
                ...prev,
                target.id
            ]);


            setVolSuccessContact({
                title: target.title,
                org: target.org,
                contact:
                    'contact' in target
                        ? target.contact
                        : ''
            });


            goBack();

            return;
        }


        if (
            applyFlowType ===
            'student'
        ) {

            setStudentApps(prev => [
                ...prev,
                target.id
            ]);


            setVolSuccessContact({
                title: target.title,
                org: target.org,
                contact:
                    'contact' in target
                        ? target.contact
                        : ''
            });


            goBack();

            return;
        }
    };


    // ==========================================================
    // FILTROS
    // ==========================================================

    const filteredJobs = jobs;


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
            />


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
                                        navigateTo(
                                            applyFlowType ===
                                                'volunteer'
                                                ? 'volunteers'
                                                : applyFlowType ===
                                                    'student'
                                                    ? 'students'
                                                    : 'jobs'
                                        )
                                    }
                                >
                                    {applyFlowType ===
                                        'volunteer'
                                        ? 'Voluntariado'
                                        : applyFlowType ===
                                            'student'
                                            ? 'Estudiantes'
                                            : 'Empleos'}
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
                {['home', 'jobs', 'volunteers', 'students'].includes(screen) && <div className="vacancy-status">
                    {listing.loading && <p role="status">Cargando oportunidades…</p>}
                    {listing.error && <p role="alert">{listing.error} <button type="button" onClick={listing.reload}>Reintentar</button></p>}
                    {dictionaries.error && <p role="alert">{dictionaries.error} <button type="button" onClick={dictionaries.reload}>Reintentar filtros</button></p>}
                    {!listing.loading && !listing.error && !listing.page.total && <p>No hay oportunidades disponibles para estos filtros.</p>}
                </div>}
                {['volunteers', 'students'].includes(screen) && <div className="vacancy-public-controls">
                    <input aria-label="Buscar oportunidades" placeholder="Título u organización" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                    <select aria-label="Categoría" value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)}><option value="Todos">Todas las categorías</option>{dictionaries.catalogs?.categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>
                    <input aria-label="Departamento o municipio" placeholder="Departamento o municipio" value={searchLocation === 'Todo el país' ? '' : searchLocation} onChange={(event) => setSearchLocation(event.target.value || 'Todo el país')} />
                    <button type="button" onClick={() => { setSearchQuery(''); setSearchLocation('Todo el país'); setSelectedArea('Todos'); }}>Limpiar filtros</button>
                </div>}
                {['jobs', 'volunteers', 'students'].includes(screen) && !listing.loading && !listing.error && <div className="vacancy-public-controls">
                    <span>{listing.page.total} oportunidades · Página {publicPage}</span>
                    <button type="button" disabled={publicPage <= 1} onClick={() => setPagination({ identity: filterIdentity, page: publicPage - 1 })}>Anterior</button>
                    <button type="button" disabled={publicPage * 20 >= listing.page.total} onClick={() => setPagination({ identity: filterIdentity, page: publicPage + 1 })}>Siguiente</button>
                </div>}
                {screen === 'detail' && !selectedJob && <div className="vacancy-status"><p role={detailError ? 'alert' : 'status'}>{detailError || 'Cargando vacante…'}</p>{detailError && <button type="button" onClick={() => navigateTo('jobs')}>Volver a las vacantes</button>}</div>}
                {publicDetailLoading && <p className="vacancy-status" role="status">Cargando oportunidad…</p>}
                {publicDetailError && <p className="vacancy-status" role="alert">{publicDetailError}</p>}
                {publicDetail && <OpportunityDetailsDialog opportunity={publicDetail} onClose={() => setPublicDetail(null)} />}


                {/* ==================================================
                    HOME
                ================================================== */}

                {screen === 'home' && (

                    <Home categories={dictionaries.catalogs?.categories.map((item) => item.name) ?? []} total={listing.page.total}
                        jobs={jobs}
                        savedJobs={savedJobs}
                        toggleSaveJob={
                            toggleSaveJob
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
                        searchQuery={
                            searchQuery
                        }
                        setSearchQuery={
                            setSearchQuery
                        }
                        searchLocation={
                            searchLocation
                        }
                        setSearchLocation={
                            setSearchLocation
                        }
                        setSelectedArea={
                            setSelectedArea
                        }
                    />

                )}


                {/* ==================================================
                    EMPLEOS
                ================================================== */}

                {screen === 'jobs' && (

                    <JobsListing categories={dictionaries.catalogs?.categories.map((item) => item.name) ?? []} total={listing.page.total} searchLocation={searchLocation} setSearchLocation={setSearchLocation}
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
                        searchQuery={
                            searchQuery
                        }
                        setSearchQuery={
                            setSearchQuery
                        }
                        selectedArea={
                            selectedArea
                        }
                        setSelectedArea={
                            setSelectedArea
                        }
                        maxSalary={
                            maxSalary
                        }
                        setMaxSalary={
                            setMaxSalary
                        }
                        showToast={
                            showToast
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
                        savedJobs={
                            savedJobs
                        }
                        toggleSaveJob={
                            toggleSaveJob
                        }
                        navigateTo={
                            navigateTo
                        }
                        setFormStep={
                            setFormStep
                        }
                    />

                )}


                {/* ==================================================
                    FORMULARIO
                ================================================== */}

                {screen === 'form' && (

                    formInitialized ? <FormFlow
                        applyingTo={applyFlowTarget}
                        formStep={formStep}
                        setFormStep={setFormStep}
                        formPersonal={formPersonal}
                        setFormPersonal={setFormPersonal}
                        formExp={formExp}
                        setFormExp={setFormExp}
                        uploadedCVName={uploadedCVName}
                        candidateState={candidateState}
                        onSubmitApplication={handleSubmitApplication}
                        showToast={showToast}
                    /> : <div role={candidateState.error ? 'alert' : 'status'}>
                        {candidateState.error || 'Cargando los datos de tu perfil…'}
                        {candidateState.error && <button type="button" onClick={() => void candidateState.reload()}>Reintentar</button>}
                    </div>

                )}


                {/* ==================================================
                    CONFIRMACIÓN
                ================================================== */}

                {screen === 'confirm' && (

                    <Confirmation
                        applications={
                            applications
                        }
                        navigateTo={
                            navigateTo
                        }
                        formPersonal={
                            formPersonal
                        }
                    />

                )}


                {/* ==================================================
                    VOLUNTARIADO
                ================================================== */}

                {screen === 'volunteers' && (

                    <Volunteers
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

                    <Students onView={viewOpportunity}
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
                    <Help />
                )}


                {/* ==================================================
                    PERFIL
                ================================================== */}

                {screen === 'profile' && (

                    <CandidateProfile
                        currentUser={currentUser}
                        handleLogout={handleLogout}
                        applications={applications}
                        setApplications={setApplications}
                        volunteerApps={volunteerApps}
                        setVolunteerApps={setVolunteerApps}
                        volunteerSpots={volunteerSpots}
                        studentApps={studentApps}
                        setStudentApps={setStudentApps}
                        studentSpots={studentSpots}
                        savedJobs={savedJobs}
                        jobs={jobs}
                        toggleSaveJob={toggleSaveJob}
                        navigateTo={navigateTo}
                        candidateState={candidateState}
                        showToast={showToast}
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

                                    setApplyFlowType(
                                        'job'
                                    );

                                    setApplyFlowTarget(
                                        qvJob
                                    );

                                    setFormStep(
                                        1
                                    );

                                    navigateTo(
                                        'form'
                                    );

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

            {volSuccessContact && (

                <div
                    className="modal-overlay"
                    onClick={() =>
                        setVolSuccessContact(
                            null
                        )
                    }
                >

                    <div
                        className="modal-content"
                        onClick={e =>
                            e.stopPropagation()
                        }
                    >

                        <div
                            style={{
                                textAlign:
                                    'center',
                                marginBottom:
                                    '15px'
                            }}
                        >

                            <span
                                style={{
                                    fontSize:
                                        '40px'
                                }}
                            >
                                🎉
                            </span>

                        </div>


                        <h3>
                            ¡Postulación Enviada!
                        </h3>


                        <p>
                            Tu solicitud para participar
                            en{' '}
                            <strong>
                                {
                                    volSuccessContact.title
                                }
                            </strong>{' '}
                            ha sido registrada con éxito.
                        </p>


                        <div
                            style={{
                                background:
                                    'var(--gl)',
                                padding:
                                    '15px',
                                borderRadius:
                                    'var(--rad)',
                                marginBottom:
                                    '15px',
                                textAlign:
                                    'center'
                            }}
                        >

                            <p
                                style={{
                                    fontSize:
                                        '12px',
                                    color:
                                        'var(--c500)',
                                    marginBottom:
                                        '5px'
                                }}
                            >
                                Comunícate directamente al
                                número del administrador:
                            </p>


                            <strong
                                style={{
                                    fontSize:
                                        '20px',
                                    color:
                                        'var(--gd)'
                                }}
                            >
                                {
                                    volSuccessContact.contact
                                }
                            </strong>


                            <p
                                style={{
                                    fontSize:
                                        '11px',
                                    color:
                                        'var(--c400)',
                                    marginTop:
                                        '5px'
                                }}
                            >
                                O bien, espera pacientemente
                                a que se comuniquen contigo.
                            </p>

                        </div>


                        <div className="modal-actions">

                            <button
                                className="modal-btn-confirm"
                                onClick={() =>
                                    setVolSuccessContact(
                                        null
                                    )
                                }
                            >
                                Entendido
                            </button>

                        </div>

                    </div>

                </div>

            )}


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
    );
}
