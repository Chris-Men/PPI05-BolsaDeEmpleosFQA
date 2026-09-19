import React, { useState, useEffect } from 'react';

import Home from './screens/Home.jsx';
import JobsListing from './screens/JobsListing.jsx';
import JobDetail from './screens/JobDetail.jsx';
import FormFlow from './screens/FormFlow.jsx';
import Confirmation from './screens/Confirmation.jsx';
import Volunteers from './screens/Volunteers.jsx';
import Students from './screens/student.jsx';
import Nosotros from './screens/Nosotros.jsx';
import CandidateProfile from './screens/CandidateProfile.jsx';

import Login from './screens/auth/Login.jsx';
import Register from './screens/auth/Register.jsx';

import AdminDashboard from './screens/admin/AdminDashboard.jsx';
import Users from './screens/admin/Users.jsx';
import NuevaPostulacion from './screens/admin/NuevaPostulacion.jsx';
import Organizaciones from './screens/admin/Organizaciones.jsx';
import Categorias from './screens/admin/Categorias.jsx';
import AdministrarPostulaciones from './screens/admin/AdministrarPostulaciones.jsx';
import CVRecibidos from './screens/admin/CVRecibidos.jsx';
import Estadisticas from './screens/admin/Estadisticas.jsx';
import Configuracion from './screens/admin/configuracion.jsx';

import Navbar from './components/users/navbar.jsx';

const initialJobsData = [
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
        status: 'Activa',
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
        status: 'Activa',
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
        status: 'Activa',
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
        status: 'Activa',
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
        status: 'Activa',
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
        status: 'Activa',
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

const initialVolunteersData = [
    {
        id: 1,
        title: 'Tutor de Refuerzo Educativo',
        org: 'Fundación Quintanilla Amaya',
        slots: 4,
        location: 'San Salvador',
        area: 'Educación',
        desc: 'Apoyo escolar presencial a niños y niñas.',
        orgInfo: 'La Fundación Quintanilla Amaya desarrolla programas de educación y salud.',
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
        orgInfo: 'Organización humanitaria dedicada a brindar salud comunitaria.',
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
        orgInfo: 'ONG enfocada en proyectos de resiliencia ecológica.',
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
        orgInfo: 'Institución dedicada al desarrollo social.',
        contact: '+503 2225-1033'
    }
];

const initialStudentSpotsData = [
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

export default function App() {

    const [screen, setScreen] = useState('home');
    const [screenHistory, setScreenHistory] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const [adminTab, setAdminTab] = useState('Dashboard');

    const [jobs, setJobs] = useState(initialJobsData);

    const [volunteerSpots, setVolunteerSpots] =
        useState(initialVolunteersData);

    const [studentSpots, setStudentSpots] =
        useState(initialStudentSpotsData);

    const [savedJobs, setSavedJobs] = useState([]);

    const [applications, setApplications] = useState([
        {
            id: 'FQA-2025-04812',
            jobId: 1,
            jobTitle: 'Coordinadora de Programas Educativos',
            orgName: 'Fundación Quintanilla Amaya',
            candidateName: 'María José López Martínez',
            candidateEmail: 'mariajose@correo.com',
            phone: '7823 4561',
            cvName: 'María_López_CV.pdf',
            status: 'Pendiente',
            date: 'Hace 2 días'
        }
    ]);

    const [volunteerApps, setVolunteerApps] = useState([]);
    const [studentApps, setStudentApps] = useState([]);

    const [activeStudentTab, setActiveStudentTab] =
        useState('social');

    const [userMenuOpen, setUserMenuOpen] =
        useState(false);

    const [selectedJob, setSelectedJob] =
        useState(initialJobsData[0]);

    const [selectedOrg, setSelectedOrg] =
        useState(null);

    const [volSuccessContact, setVolSuccessContact] =
        useState(null);

    const [applyFlowType, setApplyFlowType] =
        useState('job');

    const [applyFlowTarget, setApplyFlowTarget] =
        useState(null);

    const [qvOpen, setQvOpen] = useState(false);
    const [qvJob, setQvJob] = useState(null);

    const [loginOpen, setLoginOpen] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] =
        useState('Todo el país');
    const [selectedArea, setSelectedArea] =
        useState('Todos');
    const [maxSalary, setMaxSalary] = useState(1500);

    const [formStep, setFormStep] = useState(1);

    const [formPersonal, setFormPersonal] = useState({
        name: 'María José',
        lastname: 'López Martínez',
        email: 'mariajose@correo.com',
        phone: '7823 4561',
        municipio: 'San Salvador',
        dept: 'San Salvador',
        level: 'Licenciatura (completa)',
        profession: 'Lic. Ciencias de la Educación'
    });

    const [formExp, setFormExp] = useState({
        lastRole: 'Coordinadora de Proyectos',
        lastOrg: 'Comunidad Unida',
        years: '2 – 4 años',
        salary: '$650 – $800',
        motivation:
            'Me apasiona el trabajo que realiza la Fundación para transformar vidas.',
        skills:
            'Gestión de proyectos, liderazgo de equipos, informes técnicos'
    });

    const [uploadedCVName, setUploadedCVName] =
        useState('María_López_CV.pdf');

    const [toastMsg, setToastMsg] = useState('');
    const [toastShow, setToastShow] = useState(false);

    const [newJobForm, setNewJobForm] = useState({
        title: '',
        org: 'Fundación Quintanilla Amaya',
        location: 'San Salvador',
        area: 'Educación',
        type: 'Tiempo completo',
        salary: '$600-$800/mes',
        desc: '',
        responsibilities: '',
        requirements: '',
        offers: '',
        status: 'Activa'
    });

    const navigateTo = (nextScreen, data = null) => {

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

    const handleAdminNavigation = tab => {

        setAdminTab(tab);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const showToast = msg => {

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

    const handleLoginSubmit = e => {

        e.preventDefault();

        if (
            !loginEmail.trim() ||
            !loginPassword.trim()
        ) {
            return;
        }

        if (
            loginEmail.toLowerCase() ===
                'admin@fundaqa.org' &&
            loginPassword === '12345678'
        ) {

            const adminUser = {
                email: loginEmail,
                role: 'admin',
                name: 'Administrador FQA',
                password: '12345678',
                initial: 'A'
            };

            setCurrentUser(adminUser);
            setLoginOpen(false);
            setAdminTab('Dashboard');
            setScreenHistory([]);
            setScreen('admin');

            showToast(
                '🔑 Sesión de administrador iniciada'
            );

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            return;
        }

        const normalUser = {
            email: loginEmail,
            role: 'user',
            name: loginEmail.split('@')[0],
            initial: loginEmail
                .charAt(0)
                .toUpperCase()
        };

        setCurrentUser(normalUser);
        setLoginOpen(false);

        showToast(
            '✓ Bienvenido candidato ' +
            normalUser.name
        );

        setScreenHistory([]);
        navigateTo('home');
    };

    const handleLogout = () => {

        setCurrentUser(null);
        setAdminTab('Dashboard');
        setScreenHistory([]);
        setScreen('home');

        showToast('❌ Sesión cerrada');

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const toggleSaveJob = id => {

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

    const handleVolunteerApplyClick = spot => {

        setApplyFlowType('volunteer');
        setApplyFlowTarget(spot);
        setFormStep(1);

        navigateTo('form');
    };

    const handleStudentApplyClick = spot => {

        setApplyFlowType('student');
        setApplyFlowTarget(spot);
        setFormStep(1);

        navigateTo('form');
    };

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
                contact: target.contact
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
                contact: target.contact
            });

            goBack();
        }
    };

    const handleCreateJob = e => {

        e.preventDefault();

        if (!newJobForm.title.trim()) {

            showToast(
                '⚠️ Ingresa el nombre de la vacante'
            );

            return;
        }

        const newId =
            jobs.length > 0
                ? Math.max(
                    ...jobs.map(job => job.id)
                ) + 1
                : 1;

        const addedJob = {

            id: newId,

            title: newJobForm.title,

            org: newJobForm.org,

            location: newJobForm.location,

            area: newJobForm.area,

            type: newJobForm.type,

            salary: newJobForm.salary,

            date: 'Hoy',

            closing: 'Cierra en 15 días',

            views: 1,

            compat: 95,

            status:
                newJobForm.status ||
                'Activa',

            desc: newJobForm.desc,

            responsibilities:
                newJobForm.responsibilities
                    ? newJobForm.responsibilities
                        .split(',')
                        .map(r => r.trim())
                        .filter(Boolean)
                    : [],

            requirements:
                newJobForm.requirements
                    ? newJobForm.requirements
                        .split(',')
                        .map(r => r.trim())
                        .filter(Boolean)
                    : [],

            offers:
                newJobForm.offers
                    ? newJobForm.offers
                        .split(',')
                        .map(o => o.trim())
                        .filter(Boolean)
                    : []
        };

        setJobs(prev => [
            addedJob,
            ...prev
        ]);

        showToast(
            '✓ Vacante publicada exitosamente'
        );

        setNewJobForm({
            title: '',
            org: 'Fundación Quintanilla Amaya',
            location: 'San Salvador',
            area: 'Educación',
            type: 'Tiempo completo',
            salary: '$600-$800/mes',
            desc: '',
            responsibilities: '',
            requirements: '',
            offers: '',
            status: 'Activa'
        });
    };

    const handleAdminDeleteJob = id => {

        setJobs(prev =>
            prev.filter(job => job.id !== id)
        );

        showToast(
            '✓ Vacante eliminada del sistema'
        );
    };

    const handleUpdateAppStatus = (
        appId,
        newStatus
    ) => {

        setApplications(prev =>
            prev.map(app =>
                app.id === appId
                    ? {
                        ...app,
                        status: newStatus
                    }
                    : app
            )
        );

        showToast(
            `✓ Estado actualizado a: ${newStatus}`
        );
    };

    const handleToggleJobStatus = (jobId, newStatus) => {

    setJobs(prevJobs =>
        prevJobs.map(job => {

            if (job.id !== jobId) {
                return job;
            }

            return {
                ...job,
                status: newStatus,
                estado: newStatus,
                draft: newStatus === 'Borrador'
            };
        })
    );

    showToast(
        `✓ Estado de vacante actualizado a: ${newStatus}`
    );
};
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
            searchLocation === 'Todo el país'
                ? true
                : job.location === searchLocation;

        const matchArea =
            selectedArea === 'Todos'
                ? true
                : job.area === selectedArea;

        return (
            matchQuery &&
            matchLoc &&
            matchArea
        );
    });

    if (screen === 'login') {

        return (
            <Login
                navigateTo={navigateTo}
                setCurrentUser={setCurrentUser}
                showToast={showToast}
            />
        );
    }

    if (screen === 'register') {

        return (
            <Register
                navigateTo={navigateTo}
                setCurrentUser={setCurrentUser}
                showToast={showToast}
            />
        );
    }

    return (

        <div id="app">

            <Navbar
                screen={screen}
                currentUser={currentUser}
                userMenuOpen={userMenuOpen}
                setUserMenuOpen={setUserMenuOpen}
                navigateTo={navigateTo}
                setScreen={setScreen}
                handleLogout={handleLogout}
            />

            {screen !== 'home' &&
                screen !== 'admin' && (

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

            <div className="screen-container">

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

                {screen === 'detail' && (
                    <JobDetail
                        selectedJob={selectedJob}
                        savedJobs={savedJobs}
                        toggleSaveJob={toggleSaveJob}
                        navigateTo={navigateTo}
                        setFormStep={setFormStep}
                    />
                )}

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

                {screen === 'confirm' && (
                    <Confirmation
                        applications={applications}
                        currentUser={currentUser}
                        setCurrentUser={setCurrentUser}
                        navigateTo={navigateTo}
                        formPersonal={formPersonal}
                    />
                )}

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

                {screen === 'nosotros' && (
                    <Nosotros />
                )}

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

                {screen === 'admin' && (

                    <>

                        {adminTab === 'Dashboard' && (
                            <AdminDashboard
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}

                                jobs={jobs}
                                setJobs={setJobs}

                                newJobForm={newJobForm}
                                setNewJobForm={setNewJobForm}

                                handleCreateJob={
                                    handleCreateJob
                                }

                                handleAdminDeleteJob={
                                    handleAdminDeleteJob
                                }

                                applications={
                                    applications
                                }

                                handleUpdateAppStatus={
                                    handleUpdateAppStatus
                                }
                            />
                        )}

                        {adminTab === 'Usuarios' && (
                            <Users
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                            />
                        )}

                        {adminTab === 'Nueva Postulación' && (
                            <NuevaPostulacion
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                                jobs={jobs}
                                setJobs={setJobs}
                                showToast={showToast}
                            />
                        )}

                        {adminTab === 'Organizaciones' && (
                            <Organizaciones
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                            />
                        )}

                        {adminTab === 'Categorías' && (
                            <Categorias
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                            />
                        )}

                        {adminTab === 'Administrar Postulaciones' && (
                            <AdministrarPostulaciones
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                                applications={applications}
                                handleUpdateAppStatus={
                                    handleUpdateAppStatus
                                }
                            />
                        )}

                        {adminTab === 'CV Recibidos' && (
                            <CVRecibidos
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                                applications={applications}
                            />
                        )}

                        {adminTab === 'Estadísticas' && (
                            <Estadisticas
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                                applications={applications}
                                jobs={jobs}
                            />
                        )}

                        {adminTab === 'Configuración' && (
                            <Configuracion
                                currentUser={currentUser}
                                handleLogout={handleLogout}
                                adminTab={adminTab}
                                setAdminTab={handleAdminNavigation}
                            />
                        )}

                    </>
                )}

            </div>

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

                        </div>

                        <div className="qv-body">

                            <p>
                                {qvJob.desc}
                            </p>

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

            {loginOpen && (

                <div
                    className="modal-overlay"
                    onClick={() =>
                        setLoginOpen(false)
                    }
                >

                    <div
                        className="modal-content"
                        onClick={e =>
                            e.stopPropagation()
                        }
                    >

                        <h3>
                            Iniciar Sesión
                        </h3>

                        <p>
                            Accede de forma segura al portal con tu dirección de correo electrónico institucional o personal.
                        </p>

                        <form
                            onSubmit={handleLoginSubmit}
                            className="modal-form"
                        >

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}
                            >

                                <label>
                                    Correo Electrónico
                                </label>

                                <input
                                    type="email"
                                    required
                                    placeholder="ejemplo@fundaqa.org"
                                    value={loginEmail}
                                    onChange={e =>
                                        setLoginEmail(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}
                            >

                                <label>
                                    Contraseña
                                </label>

                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={loginPassword}
                                    onChange={e =>
                                        setLoginPassword(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="submit"
                                    className="modal-btn-confirm"
                                >
                                    Ingresar
                                </button>

                                <button
                                    type="button"
                                    className="modal-btn-cancel"
                                    onClick={() =>
                                        setLoginOpen(false)
                                    }
                                >
                                    Cancelar
                                </button>

                            </div>

                        </form>

                        <div className="login-hint">

                            <strong>
                                Tip de acceso rápido:
                            </strong>

                            <br />

                            • Administrador:{' '}

                            <code>
                                admin@fundaqa.org
                            </code>

                            {' / '}

                            <code>
                                12345678
                            </code>

                            <br />

                            • Candidato normal:
                            usa cualquier otro correo y contraseña

                        </div>

                    </div>

                </div>
            )}

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

                        <p>
                            {selectedOrg.orgInfo}
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