import { useEffect, useState } from 'react';
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
import { AuthenticatedDashboard } from './components/admin/AuthenticatedDashboard';
import Home from './screens/Home';
import JobsListing from './screens/JobsListing';
import JobDetail from './screens/JobDetail';
import FormFlow from './screens/FormFlow';
import Confirmation from './screens/Confirmation';
import Volunteers from './screens/Volunteers';
import Students from './screens/student';
import Nosotros from './screens/Nosotros';
import CandidateProfile from './screens/CandidateProfile';

import Login from './screens/auth/Login';
import Register from './screens/auth/Register';


// ============================================================
// COMPONENTES
// ============================================================

import Navbar from './components/users/navbar';


// ============================================================
// DATOS INICIALES
// ============================================================

const initialJobsData: Job[] = [
    {
        id: 1,
        title: 'Coordinadora de Programas Educativos',
        org: 'Fundación Quintanilla Amaya',
        location: 'San Salvador',
        area: 'Educación',
        type: 'Tiempo completo',
        salary: '$650–$800/mes',
        date: 'Hace 2 días',
        closing: 'Cierra en 5 días',
        isFqa: true,
        isNew: true,
        views: 84,
        compat: 82,
        desc: 'Buscamos una persona apasionada por la educación transformadora que lidere la planificación y ejecución de nuestros programas de refuerzo educativo en comunidades vulnerables de San Salvador.',
        responsibilities: [
            'Diseñar y coordinar los planes curriculares del Eje de Educación.',
            'Supervisar y acompañar a un equipo de 8 facilitadores en campo.',
            'Elaborar reportes de impacto mensuales y semestrales para donantes.',
            'Gestionar alianzas con escuelas públicas, MINED y cooperantes.'
        ],
        requirements: [
            'Licenciatura en Ciencias de la Educación, Trabajo Social o afines.',
            'Mínimo 2 años de experiencia en gestión de proyectos sociales.',
            'Disponibilidad para realizar trabajo de campo un 50% del tiempo.'
        ],
        offers: [
            'Salario de $650 a $800 mensuales según experiencia.',
            'Prestaciones de ley completas (ISSS, AFP, aguinaldo).',
            'Viáticos de transporte para visitas de campo.'
        ]
    },

    {
        id: 2,
        title: 'Trabajadora Social Comunitaria',
        org: 'CARITAS El Salvador',
        location: 'Mejicanos',
        area: 'Bienestar Social',
        type: 'Tiempo completo',
        salary: '$550–$680/mes',
        date: 'Hace 4 días',
        isHot: true,
        views: 120,
        compat: 75,
        desc: 'Buscamos un/a profesional de Trabajo Social capacitado para integrarse a nuestro equipo comunitario de apoyo familiar en la zona norte de San Salvador.',
        responsibilities: [
            'Realizar visitas domiciliarias y estudios socioeconómicos de familias.',
            'Coordinar la entrega de insumos de ayuda humanitaria.',
            'Facilitar talleres de integración y dinámicas comunitarias.'
        ],
        requirements: [
            'Graduado/a de Licenciatura en Trabajo Social.',
            'Experiencia mínima de 1 año en trabajo de campo directo.',
            'Excelentes relaciones interpersonales y empatía.'
        ],
        offers: [
            'Salario base de $550 a $680/mes.',
            'Estabilidad laboral y capacitaciones de desarrollo profesional.'
        ]
    },

    {
        id: 3,
        title: 'Especialista en Salud Comunitaria',
        org: 'Cruz Roja Salvadoreña',
        location: 'San Miguel',
        area: 'Salud',
        type: 'Contrato',
        salary: '$500–$620/mes',
        date: 'Hace 1 semana',
        isUrgent: true,
        closing: 'Cierra en 3 días',
        views: 92,
        compat: 60,
        desc: 'Lidera las campañas de atención de salud primaria y prevención sanitaria preventiva en comunidades de la región oriental de El Salvador.',
        responsibilities: [
            'Coordinar brigadas médicas móviles en zonas rurales.',
            'Impartir charlas sobre prevención de enfermedades vectoriales.',
            'Mantener inventarios y solicitudes de medicamentos básicos.'
        ],
        requirements: [
            'Licenciatura en Enfermería, Salud Pública o afines.',
            'Experiencia de campo en clínicas rurales u ONGs.',
            'Residencia en la zona oriental o disponibilidad para traslado.'
        ],
        offers: [
            'Contrato por proyecto de 10 meses con opción a renovación.',
            'Salario competitivo y seguro de vida.'
        ]
    },

    {
        id: 4,
        title: 'Promotor/a Ambiental de Campo',
        org: 'Fundación PIES',
        location: 'Santa Ana',
        area: 'Medio Ambiente',
        type: 'Medio tiempo',
        salary: '$320–$380/mes',
        date: 'Hace 3 días',
        views: 45,
        compat: 90,
        desc: 'Participa de forma proactiva en el despliegue del proyecto regional de reforestación y conservación de cuencas hidrográficas en Santa Ana.',
        responsibilities: [
            'Sensibilizar a los agricultores en técnicas de agricultura sostenible.',
            'Coordinar campañas de reforestación comunitaria.',
            'Monitorear la calidad de las cuencas locales.'
        ],
        requirements: [
            'Estudios universitarios en Agronomía, Biología o afines.',
            'Facilidad para comunicarse con poblaciones rurales.',
            'Amor por la ecología y el trabajo al aire libre.'
        ],
        offers: [
            'Plaza de medio tiempo (20 horas semanales flexibles).',
            'Oportunidad de desarrollo y crecimiento técnico.'
        ]
    },

    {
        id: 5,
        title: 'Oficial de Comunicaciones',
        org: 'World Vision El Salvador',
        location: 'Remoto',
        area: 'Medio Ambiente',
        type: 'Remoto',
        salary: '$700–$900/mes',
        date: 'Hoy',
        isNew: true,
        views: 110,
        compat: 70,
        desc: 'Buscamos un comunicador creativo que cree contenido atractivo y gestione las redes de nuestra organización.',
        responsibilities: [
            'Diseñar estrategias de contenido para redes sociales y boletines.',
            'Redactar e ilustrar historias de éxito.',
            'Coordinar ruedas de prensa.'
        ],
        requirements: [
            'Licenciatura en Periodismo, Comunicaciones o Mercadeo.',
            'Excelente ortografía y redacción.',
            'Portafolio de diseño o fotografía.'
        ],
        offers: [
            'Modalidad 100% remota.',
            'Salario atractivo de $700 a $900 mensuales.'
        ]
    },

    {
        id: 6,
        title: 'Coordinador de Autonomía Económica',
        org: 'Habitat for Humanity',
        location: 'Soyapango',
        area: 'Autonomía Económica',
        type: 'Tiempo completo',
        salary: '$580–$720/mes',
        date: 'Hace 5 días',
        views: 74,
        compat: 65,
        desc: 'Lidera las iniciativas comunitarias orientadas al emprendimiento local y la capacitación financiera técnica.',
        responsibilities: [
            'Impartir talleres de educación financiera.',
            'Asesorar y evaluar la entrega de microcréditos.',
            'Organizar ferias de emprendimiento.'
        ],
        requirements: [
            'Licenciatura en Administración de Empresas, Economía o afines.',
            'Experiencia capacitando grupos comunitarios.',
            'Conocimientos sólidos en microfinanzas.'
        ],
        offers: [
            'Estabilidad laboral completa.',
            'Salario competitivo más bonificaciones.'
        ]
    }
];

const initialVolunteersData: VolunteerSpot[] = [
    {
        id: 1,
        title: 'Tutor de Refuerzo Educativo',
        org: 'Fundación Quintanilla Amaya',
        slots: 4,
        location: 'San Salvador',
        area: 'Educación',
        desc: 'Apoyo escolar presencial a niños y niñas.',
        orgInfo:
            'La Fundación Quintanilla Amaya desarrolla programas de educación y salud.',
        contact: '+503 7623-4832'
    },

    {
        id: 2,
        title: 'Asistente Médico de Campaña',
        org: 'Cruz Roja Salvadoreña',
        slots: 2,
        location: 'San Miguel',
        area: 'Salud',
        desc: 'Apoyo logístico en jornadas comunitarias.',
        orgInfo:
            'Organización humanitaria dedicada a brindar salud comunitaria.',
        contact: '+503 2239-4900'
    },

    {
        id: 3,
        title: 'Promotor de Reciclaje Urbano',
        org: 'Fundación PIES',
        slots: 5,
        location: 'Santa Ana',
        area: 'Medio Ambiente',
        desc: 'Visitas de sensibilización sobre reciclaje.',
        orgInfo:
            'ONG enfocada en proyectos de resiliencia ecológica.',
        contact: '+503 2441-1022'
    },

    {
        id: 4,
        title: 'Facilitador de Talleres Técnicos',
        org: 'CARITAS El Salvador',
        slots: 3,
        location: 'Mejicanos',
        area: 'Autonomía Económica',
        desc: 'Colabora dictando talleres técnicos.',
        orgInfo:
            'Institución dedicada al desarrollo social.',
        contact: '+503 2225-1033'
    }
];

const initialStudentSpotsData: StudentSpot[] = [
    {
        id: 1,
        tipo: 'social',
        title: 'Voluntariado en Refuerzo Escolar',
        org: 'Fundación Quintanilla Amaya',
        location: 'San Salvador',
        area: 'Educación',
        desc: 'Apoya sesiones de refuerzo escolar para niños de comunidades vulnerables.',
        horas: 40,
        contact: '+503 7623-4832'
    },

    {
        id: 2,
        tipo: 'practica',
        title: 'Práctica en Trabajo Social',
        org: 'CARITAS El Salvador',
        location: 'Mejicanos',
        area: 'Bienestar Social',
        desc: 'Acompaña visitas domiciliarias y estudios socioeconómicos como parte de tu práctica profesional.',
        duracion: '3 meses',
        contact: '+503 2225-1033'
    }
];


// ============================================================
// APP
// ============================================================


/** Remounts account-scoped demo state whenever the real identity changes. */
export default function App() {
    const { status, session, error, retry } = useAuth();
    if (status === 'loading') return <main className="session-status" role="status">Verificando sesión…</main>;
    if (status === 'error') return <main className="session-status">
        <p role="alert">{error}</p><button type="button" onClick={() => void retry()}>Reintentar</button>
    </main>;
    if (session?.roles.some((role) => role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR')) {
        return <AuthenticatedDashboard key={session.userId} />;
    }
    return <PublicApp key={session?.userId ?? 'anonymous'} />;
}

/** Public navigation and candidate prototype, scoped to one authenticated account. */
function PublicApp() {
    const { session, logout } = useAuth();


    // ==========================================================
    // NAVEGACIÓN GLOBAL
    // ==========================================================

    const [screen, setScreen] = useState<ScreenName>('home');
    const [screenHistory, setScreenHistory] = useState<ScreenName[]>([]);

    const currentUser: CurrentUser | null = session?.roles.includes('CANDIDATE') ? {
        email: session.user.email, role: 'candidate', name: session.user.fullName,
        initial: session.user.fullName.charAt(0).toUpperCase(),
    } : null;


    // ==========================================================
    // DATOS
    // ==========================================================

    const jobs = initialJobsData;

    const volunteerSpots = initialVolunteersData;

    const studentSpots = initialStudentSpotsData;

    const [savedJobs, setSavedJobs] = useState<number[]>([]);

    const [applications, setApplications] = useState<CandidateApplication[]>([]);

    const [volunteerApps, setVolunteerApps] = useState<number[]>([]);
    const [studentApps, setStudentApps] = useState<number[]>([]);

    const [activeStudentTab, setActiveStudentTab] =
        useState<StudentOpportunityType>('social');


    // ==========================================================
    // MENÚ DEL USUARIO
    // ==========================================================

    const [userMenuOpen, setUserMenuOpen] =
        useState(false);


    // ==========================================================
    // SELECCIONES
    // ==========================================================

    const [selectedJob, setSelectedJob] =
        useState<Job>(initialJobsData[0]);

    const [selectedOrg, setSelectedOrg] =
        useState<VolunteerSpot | null>(null);

    const [volSuccessContact, setVolSuccessContact] =
        useState<SuccessContact | null>(null);


    // ==========================================================
    // FLUJO DE POSTULACIÓN
    // ==========================================================

    const [applyFlowType, setApplyFlowType] =
        useState<'job' | 'volunteer' | 'student'>('job');

    const [applyFlowTarget, setApplyFlowTarget] =
        useState<ApplicationTarget | null>(null);


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


    // ==========================================================
    // FORMULARIO
    // ==========================================================

    const [formStep, setFormStep] =
        useState(1);

    const [formPersonal, setFormPersonal] = useState({
        name: currentUser?.name ?? '', lastname: '', email: currentUser?.email ?? '',
        phone: '', municipio: '', dept: '', level: '', profession: ''
    });

    const [formExp, setFormExp] = useState({
        lastRole: '', lastOrg: '', years: '', salary: '', motivation: '', skills: ''
    });

    const [uploadedCVName, setUploadedCVName] =
        useState('');


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

    const navigateTo = (nextScreen: ScreenName, data: Job | null = null) => {

        setScreenHistory(prev => [
            ...prev,
            screen
        ]);

        setScreen(nextScreen);

        if (data && nextScreen === 'detail') {
            setSelectedJob(data);
            setApplyFlowType('job');
            setApplyFlowTarget(data);
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };


    const goBack = () => {

        if (screenHistory.length > 0) {

            const previousScreen =
                screenHistory[screenHistory.length - 1];

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

        return () => clearTimeout(timer);

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
        void logout().catch((failure: unknown) => {
            showToast(failure instanceof Error ? failure.message : 'No fue posible cerrar la sesión.');
        });
    };


    // ==========================================================
    // FAVORITOS
    // ==========================================================

    const toggleSaveJob = (id: number) => {

        if (savedJobs.includes(id)) {

            setSavedJobs(prev =>
                prev.filter(jobId => jobId !== id)
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

    const handleVolunteerApplyClick = (spot: VolunteerSpot) => {

        setApplyFlowType('volunteer');
        setApplyFlowTarget(spot);
        setFormStep(1);

        navigateTo('form');
    };


    const handleStudentApplyClick = (spot: StudentSpot) => {

        setApplyFlowType('student');
        setApplyFlowTarget(spot);
        setFormStep(1);

        navigateTo('form');
    };


    // ==========================================================
    // ENVÍO DE POSTULACIÓN
    // ==========================================================

    const handleSubmitApplication = () => {

        const target = applyFlowTarget;

        if (!target) return;


        if (applyFlowType === 'job') {

            const refNum =
                'FQA-2025-' +
                Math.floor(
                    Math.random() * 90000 + 10000
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
                    uploadedCVName ||
                    'María_López_CV.pdf',

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


        if (applyFlowType === 'volunteer') {

            setVolunteerApps(prev => [
                ...prev,
                target.id
            ]);

            setVolSuccessContact({
                title: target.title,
                org: target.org,
                contact: 'contact' in target ? target.contact : ''
            });

            goBack();

            return;
        }


        if (applyFlowType === 'student') {

            setStudentApps(prev => [
                ...prev,
                target.id
            ]);

            setVolSuccessContact({
                title: target.title,
                org: target.org,
                contact: 'contact' in target ? target.contact : ''
            });

            goBack();

            return;
        }
    };


    // ==========================================================
    // FILTROS
    // ==========================================================

    const filteredJobs = jobs.filter(job => {

        const query =
            searchQuery.toLowerCase();

        const matchQuery =
            job.title
                .toLowerCase()
                .includes(query) ||
            job.org
                .toLowerCase()
                .includes(query);


        const matchLoc =
            searchLocation ===
                'Todo el país'
                ? true
                : job.location ===
                    searchLocation;


        const matchArea =
            selectedArea === 'Todos'
                ? true
                : job.area ===
                    selectedArea;


        return (
            matchQuery &&
            matchLoc &&
            matchArea
        );
    });


    // ==========================================================
    // LOGIN
    // ==========================================================

    if (screen === 'login' || (!currentUser && ['profile', 'form', 'confirm'].includes(screen))) {

        return (
            <Login
                navigateTo={navigateTo}
            />
        );
    }


    // ==========================================================
    // REGISTRO
    // ==========================================================

    if (screen === 'register') {

        return (
            <Register
                navigateTo={navigateTo}
                showToast={showToast}
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


                        {screen === 'jobs' && (
                            <span className="bcur">
                                Bolsa de Empleo
                            </span>
                        )}


                        {screen === 'detail' && (
                            <>
                                <span
                                    onClick={() =>
                                        navigateTo('jobs')
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


                        {screen === 'form' && (
                            <>
                                <span
                                    onClick={() =>
                                        navigateTo(
                                            applyFlowType === 'volunteer'
                                                ? 'volunteers'
                                                : applyFlowType === 'student'
                                                    ? 'students'
                                                    : 'jobs'
                                        )
                                    }
                                >
                                    {applyFlowType === 'volunteer'
                                        ? 'Voluntariado'
                                        : applyFlowType === 'student'
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


                        {screen === 'confirm' && (
                            <span className="bcur">
                                Confirmación
                            </span>
                        )}


                        {screen === 'volunteers' && (
                            <span className="bcur">
                                Voluntariados disponibles
                            </span>
                        )}


                        {screen === 'students' && (
                            <span className="bcur">
                                Oportunidades para Estudiantes
                            </span>
                        )}


                        {screen === 'nosotros' && (
                            <span className="bcur">
                                Nuestra misión
                            </span>
                        )}


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


                {/* HOME */}

                {screen === 'home' && (

                    <Home
                        jobs={jobs}
                        savedJobs={savedJobs}
                        toggleSaveJob={toggleSaveJob}
                        navigateTo={navigateTo}
                        setQvJob={setQvJob}
                        setQvOpen={setQvOpen}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchLocation={searchLocation}
                        setSearchLocation={setSearchLocation}
                        setSelectedArea={setSelectedArea}
                    />

                )}


                {/* EMPLEOS */}

                {screen === 'jobs' && (

                    <JobsListing
                        filteredJobs={filteredJobs}
                        selectedJob={selectedJob}
                        navigateTo={navigateTo}
                        setQvJob={setQvJob}
                        setQvOpen={setQvOpen}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedArea={selectedArea}
                        setSelectedArea={setSelectedArea}
                        maxSalary={maxSalary}
                        setMaxSalary={setMaxSalary}
                        showToast={showToast}
                    />

                )}


                {/* DETALLE */}

                {screen === 'detail' && (

                    <JobDetail
                        selectedJob={selectedJob}
                        savedJobs={savedJobs}
                        toggleSaveJob={toggleSaveJob}
                        navigateTo={navigateTo}
                        setFormStep={setFormStep}
                    />

                )}


                {/* FORMULARIO */}

                {screen === 'form' && (

                    <FormFlow
                        applyingTo={applyFlowTarget}
                        formStep={formStep}
                        setFormStep={setFormStep}
                        formPersonal={formPersonal}
                        setFormPersonal={setFormPersonal}
                        formExp={formExp}
                        setFormExp={setFormExp}
                        uploadedCVName={uploadedCVName}
                        setUploadedCVName={setUploadedCVName}
                        onSubmitApplication={handleSubmitApplication}
                        showToast={showToast}
                    />

                )}


                {/* CONFIRMACIÓN */}

                {screen === 'confirm' && (

                    <Confirmation
                        applications={applications}
                        navigateTo={navigateTo}
                        formPersonal={formPersonal}
                    />

                )}


                {/* VOLUNTARIADO */}

                {screen === 'volunteers' && (

                    <Volunteers
                        volunteerSpots={volunteerSpots}
                        volunteerApps={volunteerApps}
                        setSelectedOrg={setSelectedOrg}
                        handleVolunteerApplyClick={
                            handleVolunteerApplyClick
                        }
                    />

                )}


                {/* ESTUDIANTES */}

                {screen === 'students' && (

                    <Students
                        studentSpots={studentSpots}
                        studentApps={studentApps}
                        activeStudentTab={activeStudentTab}
                        setActiveStudentTab={setActiveStudentTab}
                        handleStudentApplyClick={
                            handleStudentApplyClick
                        }
                    />

                )}


                {/* NOSOTROS */}

                {screen === 'nosotros' && (
                    <Nosotros />
                )}


                {/* PERFIL */}

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
                        uploadedCVName={uploadedCVName}
                        setUploadedCVName={setUploadedCVName}
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
                                    (req, idx) => (

                                        <li key={idx}>
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

                                    setQvOpen(false);

                                    setApplyFlowType('job');

                                    setApplyFlowTarget(qvJob);

                                    setFormStep(1);

                                    navigateTo('form');

                                }}
                            >
                                Aplicar ahora →
                            </button>


                            <button
                                className="qv-close"
                                onClick={() =>
                                    setQvOpen(false)
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

            {selectedOrg && (

                <div
                    className="modal-overlay"
                    onClick={() =>
                        setSelectedOrg(null)
                    }
                >

                    <div
                        className="modal-content"
                        onClick={e =>
                            e.stopPropagation()
                        }
                    >

                        <h3>
                            Sobre {selectedOrg.org}
                        </h3>

                        <p
                            style={{
                                fontStyle: 'italic',
                                color: 'var(--c500)'
                            }}
                        >
                            Eje de impacto:{' '}
                            {selectedOrg.area}
                        </p>

                        <p
                            style={{
                                marginTop: '10px',
                                fontSize: '13.5px',
                                color: 'var(--c700)'
                            }}
                        >
                            {selectedOrg.orgInfo}
                        </p>

                        <p
                            style={{
                                marginTop: '10px',
                                fontSize: '12px',
                                color: 'var(--c400)'
                            }}
                        >
                            <strong>
                                Ubicación de cobertura:
                            </strong>{' '}
                            {selectedOrg.location}
                        </p>

                        <div className="modal-actions">

                            <button
                                className="modal-btn-confirm"
                                onClick={() =>
                                    setSelectedOrg(null)
                                }
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* ======================================================
                POSTULACIÓN EXITOSA
            ====================================================== */}

            {volSuccessContact && (

                <div
                    className="modal-overlay"
                    onClick={() =>
                        setVolSuccessContact(null)
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
                                textAlign: 'center',
                                marginBottom: '15px'
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '40px'
                                }}
                            >
                                🎉
                            </span>
                        </div>


                        <h3>
                            ¡Postulación Enviada!
                        </h3>


                        <p>
                            Tu solicitud para participar en{' '}
                            <strong>
                                {volSuccessContact.title}
                            </strong>{' '}
                            ha sido registrada con éxito.
                        </p>


                        <div
                            style={{
                                background: 'var(--gl)',
                                padding: '15px',
                                borderRadius: 'var(--rad)',
                                marginBottom: '15px',
                                textAlign: 'center'
                            }}
                        >

                            <p
                                style={{
                                    fontSize: '12px',
                                    color: 'var(--c500)',
                                    marginBottom: '5px'
                                }}
                            >
                                Comunícate directamente al número del administrador:
                            </p>

                            <strong
                                style={{
                                    fontSize: '20px',
                                    color: 'var(--gd)'
                                }}
                            >
                                {volSuccessContact.contact}
                            </strong>

                            <p
                                style={{
                                    fontSize: '11px',
                                    color: 'var(--c400)',
                                    marginTop: '5px'
                                }}
                            >
                                O bien, espera pacientemente a que se comuniquen contigo.
                            </p>

                        </div>


                        <div className="modal-actions">

                            <button
                                className="modal-btn-confirm"
                                onClick={() =>
                                    setVolSuccessContact(null)
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
                    toastShow ? 'show' : ''
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