import { useEffect, useId, useState } from 'react';
import { useApplications, useNotifications } from '../hooks/useApplications';
import { ApplicationList } from '../components/applications/ApplicationList';
import { CandidateNotifications } from '../components/applications/CandidateNotifications';

import {
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  House,
  LogOut,
  Menu,
  Settings,
  Star,
  UserRound,
  X,
  Bell,
} from 'lucide-react';

import { CandidateSettings } from '../components/users/CandidateSettings';
import { CandidateProfileEditor } from '../components/users/CandidateProfileEditor';
import { SavedOpportunityList } from '../components/users/SavedOpportunityList';
import { useSavedOpportunityState } from '../hooks/useSavedOpportunities';
import { ResumeManager } from '../components/users/ResumeManager';
import { ProfileApplicationSummary } from '../components/users/ProfileApplicationSummary';
import type { CandidateSummarySection } from '../types/application';
import type { LucideIcon } from 'lucide-react';
import type { CandidateProfileState } from '../hooks/useCandidateProfile';

import '../styles/users/profileuser.css';

import type {
  CurrentUser,
  NavigateTo,
} from '../types/models';

import fqaLogo from '../components/imagenes/logo/logo 1.png';

interface CandidateProfileProps {
  currentUser: CurrentUser | null;
  handleLogout: () => void;

  onResume: (key:string) => void;
  onViewOpportunity: (key: string) => void;

  navigateTo: NavigateTo;

  candidateState: CandidateProfileState;

  notificationsRequest: number;
}

/** Summary card metadata keeps the selected card, counter and panel heading consistent. */
interface ProfileSummaryOption {
  section: CandidateSummarySection;
  label: string;
  title: string;
  count: number | string;
  icon: LucideIcon;
}

/** Sidebar destinations keep personal editing separate from the candidate overview. */
type ProfileSection = 'overview' | 'personal' | 'settings' | 'applications' | 'notifications';

/** Renders the candidate overview, personal editor, and account settings. */
export default function CandidateProfile({
  currentUser,
  handleLogout,

  onResume,
  onViewOpportunity,

  navigateTo,

  candidateState,

  notificationsRequest,
}: CandidateProfileProps) {

  /* =========================================================
     ESTADOS
  ========================================================= */

  const [activeTab, setActiveTab] = useState<CandidateSummarySection>('saved');
  const summaryPanelId = useId();
  const summaryTitleId = useId();
  const initialApplication = Number(new URLSearchParams(window.location.search).get('postulacion')) || undefined;
  const [activeSection, setActiveSection] = useState<ProfileSection>(notificationsRequest > 0 ? 'notifications' : initialApplication ? 'applications' : 'overview');
  // Repeated header navigation must also work while another profile section is open.
  useEffect(() => { if (notificationsRequest > 0) setActiveSection('notifications'); }, [notificationsRequest]);
  const notifications = useNotifications();
  const savedState = useSavedOpportunityState();
  const all = useApplications({ pageSize:1 });
  const employment = useApplications({ pageSize:1, kind:'EMPLOYMENT' });
  const volunteering = useApplications({ pageSize:1, kind:'VOLUNTEER' });
  const social = useApplications({ pageSize:1, kind:'SOCIAL_HOURS' });
  const internship = useApplications({ pageSize:1, kind:'INTERNSHIP' });
  const changed = () => { all.reload(); employment.reload(); volunteering.reload(); social.reload(); internship.reload(); notifications.reload(); };
  const [confirmLogout, setConfirmLogout] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);


  /* =========================================================
     DATOS
  ========================================================= */

  const totalActive = all.loading || all.error ? '—' : all.page.total;
  const summaryOptions: ProfileSummaryOption[] = [
    { section: 'applications', label: 'Postulaciones', title: 'Mis postulaciones recientes', count: totalActive, icon: BriefcaseBusiness },
    { section: 'employment', label: 'Empleos', title: 'Postulaciones a empleos', count: employment.loading || employment.error ? '—' : employment.page.total, icon: FileText },
    { section: 'volunteering', label: 'Voluntariados', title: 'Postulaciones a voluntariados', count: volunteering.loading || volunteering.error ? '—' : volunteering.page.total, icon: Heart },
    { section: 'students', label: 'Estudiantes', title: 'Postulaciones de estudiantes', count: social.loading || internship.loading || social.error || internship.error ? '—' : social.page.total + internship.page.total, icon: GraduationCap },
    { section: 'saved', label: 'Guardadas', title: 'Vacantes Guardadas', count: savedState.error ? '—' : savedState.total ?? '—', icon: Star },
  ];
  const selection = summaryOptions.find(option => option.section === activeTab)!;
  const SummaryIcon = selection.icon;
  /** Opens the complete list instead of reopening an earlier notification's deep-linked detail. */
  const viewApplications = (): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete('postulacion');
    window.history.replaceState(null, '', url);
    setActiveSection('applications');
  };


  /* =========================================================
     NAVEGACIÓN DEL SIDEBAR
  ========================================================= */

  const goToJobs = () => {
    navigateTo('jobs');
    setMobileMenuOpen(false);
  };



  const goToHelp = () => {
    navigateTo('help');
    setMobileMenuOpen(false);
  };


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
          SIDEBAR
      ===================================================== */}

      <aside
        className={`profile-sidebar ${
          mobileMenuOpen
            ? 'profile-sidebar-open'
            : ''
        }`}
      >

        {/* ===================================================
            LOGO FQA
        =================================================== */}

        <div className="profile-brand">

          <img
            src={fqaLogo}
            alt="FQA Empleos"
            className="profile-brand-logo"
          />

        </div>


        {/* ===================================================
            CERRAR MENÚ MOBILE
        =================================================== */}

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


        {/* ===================================================
            NAVEGACIÓN
        =================================================== */}

        <nav className="profile-sidebar-nav">

          <button
            type="button"
            className={`profile-sidebar-item ${
              activeSection === 'overview'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              setActiveSection('overview');
              setMobileMenuOpen(false);
            }}
            aria-current={
              activeSection === 'overview'
                ? 'page'
                : undefined
            }
          >
            <House size={19} />

            <span>
              Mi perfil
            </span>
          </button>

          <button
            type="button"
            className={`profile-sidebar-item ${activeSection === 'personal' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('personal');
              setMobileMenuOpen(false);
            }}
            aria-current={activeSection === 'personal' ? 'page' : undefined}
          >
            <UserRound size={19} />
            <span>Datos Personales</span>
          </button>


          <button
            type="button"
            className={`profile-sidebar-item ${activeSection === 'applications' ? 'active' : ''}`}
            onClick={() => {setActiveSection('applications'); setMobileMenuOpen(false);}}
          >
            <BriefcaseBusiness size={19} />

            <span>
              Mis postulaciones
            </span>
          </button>


          <button
            type="button"
            className={`profile-sidebar-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => {setActiveSection('notifications'); setMobileMenuOpen(false);}}
          >
            <Bell size={19} />

            <span>
              Notificaciones
            </span>

            <span className="profile-notification-count">
              {notifications.result.unreadCount}
            </span>
          </button>


          <button
            type="button"
            className={`profile-sidebar-item ${
              activeSection === 'settings'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              setActiveSection('settings');
              setMobileMenuOpen(false);
            }}
            aria-current={
              activeSection === 'settings'
                ? 'page'
                : undefined
            }
          >
            <Settings size={19} />

            <span>
              Configuración
            </span>
          </button>

        </nav>


        {/* ===================================================
            AYUDA
        =================================================== */}

        <button
          type="button"
          className="profile-sidebar-help"
          onClick={goToHelp}
        >

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

        </button>

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
            BOTÓN MENÚ MOBILE
            Se mantiene porque eliminamos el TOPBAR.
        =================================================== */}

        <div className="profile-mobile-header">

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

        </div>


        {/* ===================================================
            CONTENIDO
        =================================================== */}

        <div className="profile-content">

          {activeSection === 'settings' ? (
            <CandidateSettings />
          ) : activeSection === 'personal' ? (
            <>
              <section className="profile-welcome">
                <div className="profile-welcome-text">
                  <h1>Datos Personales</h1>
                  <p>Consulta y actualiza tu información personal y profesional.</p>
                </div>
              </section>
              <CandidateProfileEditor state={candidateState} />
            </>
          ) : activeSection === 'applications' ? (
            <ApplicationList onResume={onResume} onChanged={changed} initialId={initialApplication} />
          ) : activeSection === 'notifications' ? (
            <CandidateNotifications onChanged={notifications.reload} />
          ) : (
            <>

              {/* =============================================
                  HEADER DEL CANDIDATO
              ============================================= */}

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


              {/* =============================================
                  ESTADÍSTICAS
              ============================================= */}

              <section className="profile-stats" aria-label="Resumen de actividad">
                {summaryOptions.map(({ section, label, count, icon: Icon }) => (
                  <button type="button" key={section}
                    className={`profile-stat-card ${activeTab === section ? 'active' : ''}`}
                    aria-label={`Ver resumen de ${label.toLowerCase()}`}
                    aria-pressed={activeTab === section} aria-controls={summaryPanelId}
                    onClick={() => setActiveTab(section)}>
                    <div className="profile-stat-icon"><Icon size={20} aria-hidden="true" /></div>
                    <div><strong>{count}</strong><span>{label}</span></div>
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </section>


              {/* =============================================
                  TABS
              ============================================= */}

              <div className="profile-tabs" aria-live="polite"><span className="profile-summary-label"><SummaryIcon size={16} aria-hidden="true" /> {selection.label} ({selection.count})</span></div>


              {/* =============================================
                  GRID DE CONTENIDO
              ============================================= */}

              <div className="profile-dashboard-grid">


                {/* ===========================================
                    POSTULACIONES
                =========================================== */}

                <section className="profile-card profile-applications-card" id={summaryPanelId} aria-labelledby={summaryTitleId}>
                  <div className="profile-card-heading">
                    <div><div className="profile-heading-icon"><SummaryIcon size={19} aria-hidden="true" /></div>
                      <h2 id={summaryTitleId}>{selection.title}</h2>
                    </div>
                  </div>
                  {activeTab !== 'saved' && <ProfileApplicationSummary key={activeTab} section={activeTab} onViewAll={viewApplications} />}

                  {activeTab === 'saved' && <SavedOpportunityList onView={onViewOpportunity} onExplore={goToJobs} />}

                </section>


                {/* ===========================================
                    DOCUMENTOS
                =========================================== */}

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

                  <ResumeManager state={candidateState} />

                </section>

              </div>

            </>
          )}

        </div>

      </main>


      {/* =====================================================
          MODAL RETIRAR
      ===================================================== */}

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
