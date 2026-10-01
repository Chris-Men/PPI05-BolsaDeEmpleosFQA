import { useState } from 'react';

import {
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  House,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';

import { DeleteOwnAccount } from '../components/users/DeleteOwnAccount';

import '../styles/users/profileuser.css';

import type {
  CandidateApplication,
  CurrentUser,
  Job,
  NavigateTo,
  RetireSelection,
  StateSetter,
  StudentSpot,
  VolunteerSpot,
} from '../types/models';

interface CandidateProfileProps {
  currentUser: CurrentUser | null;
  handleLogout: () => void;

  applications: CandidateApplication[];
  setApplications: StateSetter<CandidateApplication[]>;

  volunteerApps: number[];
  setVolunteerApps: StateSetter<number[]>;

  volunteerSpots: VolunteerSpot[];

  studentApps: number[];
  setStudentApps: StateSetter<number[]>;

  studentSpots: StudentSpot[];

  savedJobs: number[];
  jobs: Job[];

  toggleSaveJob: (id: number) => void;

  navigateTo: NavigateTo;

  uploadedCVName: string;
  setUploadedCVName: StateSetter<string>;

  showToast: (message: string) => void;
}

type ProfileTab =
  | 'jobs'
  | 'volunteer'
  | 'student'
  | 'saved';

export default function CandidateProfile({
  currentUser,
  handleLogout,

  applications,
  setApplications,

  volunteerApps,
  setVolunteerApps,
  volunteerSpots,

  studentApps,
  setStudentApps,
  studentSpots,

  savedJobs,
  jobs,

  toggleSaveJob,

  navigateTo,

  uploadedCVName,
  setUploadedCVName,

  showToast,
}: CandidateProfileProps) {
  /* =========================================================
     ESTADOS
  ========================================================= */

  const [activeTab, setActiveTab] =
    useState<ProfileTab>('jobs');

  const [confirmRetire, setConfirmRetire] =
    useState<RetireSelection | null>(null);

  const [confirmLogout, setConfirmLogout] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);


  /* =========================================================
     DATOS
  ========================================================= */

  const myApplications = applications.filter(
    (app) =>
      app.candidateEmail === currentUser?.email
  );

  const myVolunteerSpots =
    volunteerSpots.filter((spot) =>
      volunteerApps.includes(spot.id)
    );

  const myStudentSpots =
    studentSpots.filter((spot) =>
      studentApps.includes(spot.id)
    );

  const mySavedJobs =
    jobs.filter((job) =>
      savedJobs.includes(job.id)
    );

  const totalActive =
    myApplications.length +
    myVolunteerSpots.length +
    myStudentSpots.length;


  /* =========================================================
     NAVEGACIÓN DEL SIDEBAR
  ========================================================= */

  const goToJobs = () => {
    navigateTo('jobs');
    setMobileMenuOpen(false);
  };

  const goToVolunteers = () => {
    navigateTo('volunteers');
    setMobileMenuOpen(false);
  };

  const goToStudents = () => {
    navigateTo('students');
    setMobileMenuOpen(false);
  };


  /* =========================================================
     RETIRAR POSTULACIÓN
  ========================================================= */

  const handleConfirmRetire = () => {
    if (!confirmRetire) return;

    if (confirmRetire.kind === 'job') {
      setApplications((prev) =>
        prev.filter(
          (application) =>
            application.id !== confirmRetire.id
        )
      );

      showToast(
        '✓ Postulación retirada exitosamente'
      );
    }

    if (confirmRetire.kind === 'volunteer') {
      setVolunteerApps((prev) =>
        prev.filter(
          (id) => id !== confirmRetire.id
        )
      );

      showToast(
        '✓ Postulación de voluntariado retirada'
      );
    }

    if (confirmRetire.kind === 'student') {
      setStudentApps((prev) =>
        prev.filter(
          (id) => id !== confirmRetire.id
        )
      );

      showToast(
        '✓ Postulación estudiantil retirada'
      );
    }

    setConfirmRetire(null);
  };


  /* =========================================================
     CV
  ========================================================= */

  const handleUploadCV = () => {
    setUploadedCVName(
      'Curriculum_Bolsa_FQA.pdf'
    );

    showToast(
      '✓ CV subido correctamente'
    );
  };

  const handleRemoveCV = () => {
    setUploadedCVName('');

    showToast(
      '✓ CV eliminado del sistema'
    );
  };


  /* =========================================================
     CERRAR SESIÓN
  ========================================================= */

  const handleConfirmLogout = () => {
    setConfirmLogout(false);
    setMobileMenuOpen(false);

    handleLogout();
  };


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="profile-user-screen">


      {/* =====================================================
          SIDEBAR DESKTOP
      ===================================================== */}

      <aside
        className={`profile-sidebar ${
          mobileMenuOpen
            ? 'profile-sidebar-open'
            : ''
        }`}
      >

        <div className="profile-brand">

          <div className="profile-brand-mark">
            <div className="profile-brand-leaf">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div>
            <strong>
              FQA Empleos
            </strong>

            <small>
              Más oportunidades, un mejor futuro
            </small>
          </div>

        </div>


        <button
          type="button"
          className="profile-mobile-close"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>


        <nav className="profile-sidebar-nav">

          <button
            type="button"
            className="profile-sidebar-item active"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            <House size={19} />

            <span>
              Mi perfil
            </span>
          </button>


          <button
            type="button"
            className="profile-sidebar-item"
            onClick={goToJobs}
          >
            <BriefcaseBusiness size={19} />

            <span>
              Mis postulaciones
            </span>
          </button>


          <button
            type="button"
            className="profile-sidebar-item"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            <FileText size={19} />

            <span>
              Mis documentos
            </span>
          </button>


          <button
            type="button"
            className="profile-sidebar-item"
            onClick={() =>
              showToast(
                'No tienes nuevas notificaciones'
              )
            }
          >
            <Bell size={19} />

            <span>
              Notificaciones
            </span>

            <span className="profile-notification-count">
              0
            </span>
          </button>

        </nav>


        <div className="profile-sidebar-help">

          <div className="profile-help-icon">
            <HelpCircle size={19} />
          </div>

          <div>
            <strong>
              ¿Necesitas ayuda?
            </strong>

            <small>
              Estamos para apoyarte
            </small>
          </div>

          <ChevronRight size={16} />

        </div>

      </aside>


      {/* =====================================================
          OVERLAY MOBILE
      ===================================================== */}

      {mobileMenuOpen && (
        <div
          className="profile-sidebar-overlay"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}


      {/* =====================================================
          CONTENIDO PRINCIPAL
      ===================================================== */}

      <main className="profile-main">


        {/* ===================================================
            TOPBAR
        =================================================== */}

        <header className="profile-topbar">

          <button
            type="button"
            className="profile-mobile-menu"
            onClick={() =>
              setMobileMenuOpen(true)
            }
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>


          <div className="profile-topbar-spacer" />


          <div className="profile-topbar-actions">

            <button
              type="button"
              className="profile-topbar-icon"
              onClick={() =>
                showToast(
                  'No tienes nuevas notificaciones'
                )
              }
              aria-label="Notificaciones"
            >
              <Bell size={20} />

              <span className="profile-notification-dot" />
            </button>


            <div className="profile-topbar-avatar">
              {currentUser?.initial || 'U'}
            </div>


            <ChevronRight
              className="profile-topbar-chevron"
              size={18}
            />

          </div>

        </header>


        {/* ===================================================
            CONTENIDO
        =================================================== */}

        <div className="profile-content">


          {/* =================================================
              HEADER DEL CANDIDATO
          ================================================= */}

          <section className="profile-welcome">

            <div className="profile-welcome-user">

              <div className="profile-large-avatar">

                {currentUser?.initial || 'U'}

                <span className="profile-avatar-edit">
                  <UserRound size={11} />
                </span>

              </div>


              <div className="profile-welcome-text">

                <h1>
                  Hola, {currentUser?.name || 'Candidato'}
                </h1>

                <p>
                  Candidato registrado
                  <span>
                    ·
                  </span>
                  Correo:{' '}
                  {currentUser?.email ||
                    'No disponible'}
                </p>

              </div>

            </div>


            <button
              type="button"
              className="profile-logout-button"
              onClick={() =>
                setConfirmLogout(true)
              }
            >
              <LogOut size={17} />

              <span>
                Cerrar Sesión
              </span>
            </button>

          </section>


          {/* =================================================
              ESTADÍSTICAS
          ================================================= */}

          <section className="profile-stats">

            <div className="profile-stat-card">

              <div className="profile-stat-icon">
                <BriefcaseBusiness size={20} />
              </div>

              <div>
                <strong>
                  {totalActive}
                </strong>

                <span>
                  Postulaciones activas
                </span>
              </div>

              <ChevronRight size={17} />

            </div>


            <div className="profile-stat-card">

              <div className="profile-stat-icon">
                <FileText size={20} />
              </div>

              <div>
                <strong>
                  {myApplications.length}
                </strong>

                <span>
                  Empleos
                </span>
              </div>

              <ChevronRight size={17} />

            </div>


            <div className="profile-stat-card">

              <div className="profile-stat-icon">
                <Heart size={20} />
              </div>

              <div>
                <strong>
                  {myVolunteerSpots.length}
                </strong>

                <span>
                  Voluntariados
                </span>
              </div>

              <ChevronRight size={17} />

            </div>


            <div className="profile-stat-card">

              <div className="profile-stat-icon">
                <GraduationCap size={20} />
              </div>

              <div>
                <strong>
                  {myStudentSpots.length}
                </strong>

                <span>
                  Estudiantes
                </span>
              </div>

              <ChevronRight size={17} />

            </div>


            <div className="profile-stat-card">

              <div className="profile-stat-icon">
                <Star size={20} />
              </div>

              <div>
                <strong>
                  {mySavedJobs.length}
                </strong>

                <span>
                  Guardadas
                </span>
              </div>

              <ChevronRight size={17} />

            </div>

          </section>


          {/* =================================================
              TABS
          ================================================= */}

          <nav className="profile-tabs">

            <button
              type="button"
              className={
                activeTab === 'jobs'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab('jobs')
              }
            >
              <BriefcaseBusiness size={16} />

              Empleos ({myApplications.length})
            </button>


            <button
              type="button"
              className={
                activeTab === 'volunteer'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab('volunteer')
              }
            >
              <Heart size={16} />

              Voluntariado (
              {myVolunteerSpots.length}
              )
            </button>


            <button
              type="button"
              className={
                activeTab === 'student'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab('student')
              }
            >
              <GraduationCap size={16} />

              Estudiantes (
              {myStudentSpots.length}
              )
            </button>


            <button
              type="button"
              className={
                activeTab === 'saved'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab('saved')
              }
            >
              <Star size={16} />

              Guardadas ({mySavedJobs.length})
            </button>

          </nav>


          {/* =================================================
              GRID DE CONTENIDO
          ================================================= */}

          <div className="profile-dashboard-grid">


            {/* ===============================================
                POSTULACIONES
            =============================================== */}

            <section className="profile-card profile-applications-card">

              {activeTab === 'jobs' && (
                <>
                  <div className="profile-card-heading">

                    <div>
                      <div className="profile-heading-icon">
                        <BriefcaseBusiness size={19} />
                      </div>

                      <div>
                        <h2>
                          Mis Postulaciones a Empleos
                        </h2>
                      </div>
                    </div>

                  </div>


                  {myApplications.length > 0 ? (

                    <div className="profile-list">

                      {myApplications.map((app) => (

                        <article
                          key={app.id}
                          className="profile-list-item"
                        >

                          <div className="profile-list-info">

                            <h3>
                              {app.jobTitle}
                            </h3>

                            <p>
                              {app.orgName}
                              {' · '}
                              Enviado: {app.date}
                            </p>

                            <small>
                              CV adjunto:{' '}
                              {app.cvName}
                            </small>

                          </div>


                          <div className="profile-list-actions">

                            <span
                              className={`profile-status ${
                                app.status ===
                                'Pendiente'
                                  ? 'pending'
                                  : app.status ===
                                    'Aprobado para Entrevista'
                                  ? 'approved'
                                  : 'rejected'
                              }`}
                            >
                              {app.status}
                            </span>


                            <button
                              type="button"
                              className="profile-small-button"
                              onClick={() =>
                                setConfirmRetire({
                                  kind: 'job',
                                  id: app.id,
                                  title:
                                    app.jobTitle,
                                })
                              }
                            >
                              Retirar
                            </button>

                          </div>

                        </article>

                      ))}

                    </div>

                  ) : (

                    <div className="profile-empty-state">

                      <div className="profile-empty-copy">

                        <p>
                          Aún no te has postulado
                          a ninguna vacante laboral.
                        </p>

                        <button
                          type="button"
                          className="profile-primary-button"
                          onClick={goToJobs}
                        >
                          <Search size={16} />

                          Explorar vacantes

                          <ChevronRight
                            size={15}
                          />
                        </button>

                      </div>


                      <div className="profile-empty-illustration">
                        <div className="profile-document-illustration">
                          <div />
                          <div />
                          <div />
                        </div>

                        <span>
                          ✓
                        </span>
                      </div>

                    </div>

                  )}
                </>
              )}


              {/* =============================================
                  VOLUNTARIADO
              ============================================= */}

              {activeTab === 'volunteer' && (
                <>
                  <div className="profile-card-heading">

                    <div>
                      <div className="profile-heading-icon">
                        <Heart size={19} />
                      </div>

                      <h2>
                        Mis Voluntariados Activos
                      </h2>
                    </div>

                  </div>


                  {myVolunteerSpots.length > 0 ? (

                    <div className="profile-list">

                      {myVolunteerSpots.map((spot) => (

                        <article
                          key={spot.id}
                          className="profile-list-item"
                        >

                          <div className="profile-list-info">

                            <h3>
                              {spot.title}
                            </h3>

                            <p>
                              {spot.org}
                              {' · '}
                              {spot.location}
                            </p>

                          </div>


                          <button
                            type="button"
                            className="profile-small-button"
                            onClick={() =>
                              setConfirmRetire({
                                kind: 'volunteer',
                                id: spot.id,
                                title:
                                  spot.title,
                              })
                            }
                          >
                            Retirar
                          </button>

                        </article>

                      ))}

                    </div>

                  ) : (

                    <div className="profile-empty-simple">

                      <Heart size={34} />

                      <p>
                        No te has postulado como
                        voluntario.
                      </p>

                      <button
                        type="button"
                        className="profile-primary-button"
                        onClick={goToVolunteers}
                      >
                        Ver oportunidades
                      </button>

                    </div>

                  )}
                </>
              )}


              {/* =============================================
                  ESTUDIANTES
              ============================================= */}

              {activeTab === 'student' && (
                <>
                  <div className="profile-card-heading">

                    <div>
                      <div className="profile-heading-icon">
                        <GraduationCap size={19} />
                      </div>

                      <h2>
                        Mis Postulaciones Estudiantiles
                      </h2>
                    </div>

                  </div>


                  {myStudentSpots.length > 0 ? (

                    <div className="profile-list">

                      {myStudentSpots.map((spot) => (

                        <article
                          key={spot.id}
                          className="profile-list-item"
                        >

                          <div className="profile-list-info">

                            <h3>
                              {spot.title}
                            </h3>

                            <p>
                              {spot.org}
                              {' · '}
                              {spot.location}
                            </p>

                            <small>
                              {spot.tipo === 'social'
                                ? '🤝 Voluntariado social'
                                : '🎓 Práctica profesional'}
                            </small>

                          </div>


                          <button
                            type="button"
                            className="profile-small-button"
                            onClick={() =>
                              setConfirmRetire({
                                kind: 'student',
                                id: spot.id,
                                title:
                                  spot.title,
                              })
                            }
                          >
                            Retirar
                          </button>

                        </article>

                      ))}

                    </div>

                  ) : (

                    <div className="profile-empty-simple">

                      <GraduationCap size={34} />

                      <p>
                        No te has postulado a
                        oportunidades para
                        estudiantes.
                      </p>

                      <button
                        type="button"
                        className="profile-primary-button"
                        onClick={goToStudents}
                      >
                        Ver oportunidades
                      </button>

                    </div>

                  )}
                </>
              )}


              {/* =============================================
                  GUARDADAS
              ============================================= */}

              {activeTab === 'saved' && (
                <>
                  <div className="profile-card-heading">

                    <div>
                      <div className="profile-heading-icon">
                        <Star size={19} />
                      </div>

                      <h2>
                        Vacantes Guardadas
                      </h2>
                    </div>

                  </div>


                  {mySavedJobs.length > 0 ? (

                    <div className="profile-list">

                      {mySavedJobs.map((job) => (

                        <article
                          key={job.id}
                          className="profile-list-item"
                        >

                          <div className="profile-list-info">

                            <h3>
                              {job.title}
                            </h3>

                            <p>
                              {job.org}
                              {' · '}
                              {job.location}
                            </p>

                          </div>


                          <div className="profile-list-actions">

                            <button
                              type="button"
                              className="profile-small-button"
                              onClick={() =>
                                navigateTo(
                                  'detail',
                                  job
                                )
                              }
                            >
                              Ver vacante
                            </button>

                            <button
                              type="button"
                              className="profile-small-button profile-danger-outline"
                              onClick={() => {
                                toggleSaveJob(
                                  job.id
                                );

                                showToast(
                                  '✓ Vacante eliminada de guardadas'
                                );
                              }}
                            >
                              Quitar
                            </button>

                          </div>

                        </article>

                      ))}

                    </div>

                  ) : (

                    <div className="profile-empty-simple">

                      <Star size={34} />

                      <p>
                        No tienes vacantes
                        guardadas todavía.
                      </p>

                      <button
                        type="button"
                        className="profile-primary-button"
                        onClick={goToJobs}
                      >
                        Explorar vacantes
                      </button>

                    </div>

                  )}
                </>
              )}

            </section>


            {/* ===============================================
                DOCUMENTOS
            =============================================== */}

            <section className="profile-card profile-documents-card">

              <div className="profile-card-heading">

                <div>
                  <div className="profile-heading-icon">
                    <FileText size={19} />
                  </div>

                  <h2>
                    Mis Documentos
                  </h2>
                </div>

              </div>


              {uploadedCVName ? (

                <div className="profile-cv-active">

                  <div className="profile-cv-icon">
                    <FileText size={22} />
                  </div>

                  <div className="profile-cv-data">

                    <strong>
                      {uploadedCVName}
                    </strong>

                    <span>
                      Cargado automáticamente
                    </span>

                  </div>


                  <button
                    type="button"
                    className="profile-cv-remove"
                    onClick={handleRemoveCV}
                    aria-label="Eliminar currículum"
                  >
                    <Trash2 size={16} />
                  </button>

                </div>

              ) : (

                <div className="profile-upload-area">

                  <div className="profile-upload-icon">
                    <Upload size={24} />
                  </div>

                  <p>
                    No tienes ningún
                    currículum activo.
                  </p>

                  <button
                    type="button"
                    className="profile-primary-button"
                    onClick={handleUploadCV}
                  >
                    <Upload size={15} />

                    Subir CV temporal
                  </button>

                  <small>
                    Formato aceptado:
                    PDF
                    <span>·</span>
                    Máx. 5 MB
                  </small>

                </div>

              )}

            </section>

          </div>


          {/* =================================================
              ELIMINAR CUENTA
          ================================================= */}

          <section className="profile-delete-section">

            <div className="profile-delete-decoration">
              <ShieldCheck size={90} />
            </div>

            <div className="profile-delete-icon">
              <Trash2 size={21} />
            </div>

            <div className="profile-delete-content">

              <h2>
                Eliminar cuenta
              </h2>

              <p>
                Al eliminar tu cuenta perderás
                el acceso a tu perfil y a tus
                postulaciones.
              </p>

              <div className="profile-delete-component">
                <DeleteOwnAccount />
              </div>

            </div>

          </section>

        </div>

      </main>


      {/* =====================================================
          MODAL RETIRAR
      ===================================================== */}

      {confirmRetire && (

        <div
          className="profile-modal-overlay"
          onClick={() =>
            setConfirmRetire(null)
          }
        >

          <div
            className="profile-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="profile-modal-warning-icon">
              !
            </div>

            <h3>
              Retirar postulación
            </h3>

            <p>
              ¿Estás seguro de que deseas
              retirar tu postulación a
              <strong>
                {' '}
                {confirmRetire.title}
              </strong>
              ?
            </p>

            <small>
              Esta acción no se puede deshacer.
            </small>

            <div className="profile-modal-actions">

              <button
                type="button"
                className="profile-modal-cancel"
                onClick={() =>
                  setConfirmRetire(null)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="profile-modal-danger"
                onClick={handleConfirmRetire}
              >
                Sí, retirar
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          MODAL CERRAR SESIÓN
      ===================================================== */}

      {confirmLogout && (

        <div
          className="profile-modal-overlay"
          onClick={() =>
            setConfirmLogout(false)
          }
        >

          <div
            className="profile-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="profile-modal-logout-icon">
              <LogOut size={22} />
            </div>

            <h3>
              Cerrar sesión
            </h3>

            <p>
              ¿Estás seguro de que deseas
              cerrar tu sesión?
            </p>

            <div className="profile-modal-actions">

              <button
                type="button"
                className="profile-modal-cancel"
                onClick={() =>
                  setConfirmLogout(false)
                }
              >
                Permanecer aquí
              </button>

              <button
                type="button"
                className="profile-modal-primary"
                onClick={handleConfirmLogout}
              >
                Sí, cerrar sesión
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
