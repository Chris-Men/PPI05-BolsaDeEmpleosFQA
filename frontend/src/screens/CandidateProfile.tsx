import { DeleteOwnAccount } from '../components/users/DeleteOwnAccount';
import { useState } from 'react';
import type {
  CandidateApplication, CurrentUser, Job, NavigateTo, RetireSelection,
  StateSetter, StudentSpot, VolunteerSpot,
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

/** Candidate profile backed by local demonstration data. */
export default function CandidateProfile({
  currentUser, handleLogout, applications, setApplications, volunteerApps,
  setVolunteerApps, volunteerSpots, studentApps, setStudentApps, studentSpots,
  savedJobs, jobs, toggleSaveJob, navigateTo, uploadedCVName,
  setUploadedCVName, showToast,
}: CandidateProfileProps) {
  const [activeTab, setActiveTab] = useState('jobs');
  const [confirmRetire, setConfirmRetire] = useState<RetireSelection | null>(null);
  // confirmRetire shape: { kind: 'job' | 'volunteer' | 'student', id, title }

  const myApplications = applications.filter(
    app => app.candidateEmail === currentUser?.email
  );

  const myVolunteerSpots = volunteerSpots.filter(spot =>
    volunteerApps.includes(spot.id)
  );

  const myStudentSpots = studentSpots.filter(spot =>
    studentApps.includes(spot.id)
  );

  const mySavedJobs = jobs.filter(job => savedJobs.includes(job.id));

  const totalActive =
    myApplications.length + myVolunteerSpots.length + myStudentSpots.length;

  const handleConfirmRetire = () => {
    if (!confirmRetire) return;

    if (confirmRetire.kind === 'job') {
      setApplications(prev => prev.filter(a => a.id !== confirmRetire.id));
      showToast('Postulación retirada exitosamente');
    }

    if (confirmRetire.kind === 'volunteer') {
      setVolunteerApps(prev => prev.filter(id => id !== confirmRetire.id));
      showToast('✓ Postulación de voluntariado retirada');
    }

    if (confirmRetire.kind === 'student') {
      setStudentApps(prev => prev.filter(id => id !== confirmRetire.id));
      showToast('✓ Postulación estudiantil retirada');
    }

    setConfirmRetire(null);
  };

  return (
    <div className="screen">
      <div className="panel-container">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="nav-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {currentUser?.initial}
            </div>
            <div>
              <h1>Hola, {currentUser?.name}</h1>
              <p style={{ color: 'var(--c400)', fontSize: '13px' }}>
                Candidato registrado · Correo: {currentUser?.email}
              </p>
            </div>
          </div>
          <button
            className="btn-panel-action"
            onClick={handleLogout}
            style={{ borderColor: '#C0392B', color: '#C0392B' }}
          >
            Cerrar Sesión
          </button>
        </div>

        {/* RESUMEN */}
        <div className="profile-summary-row">
          <div className="profile-summary-stat">
            <strong>{totalActive}</strong>
            <span>Postulaciones activas</span>
          </div>
          <div className="profile-summary-stat">
            <strong>{myApplications.length}</strong>
            <span>Empleos</span>
          </div>
          <div className="profile-summary-stat">
            <strong>{myVolunteerSpots.length}</strong>
            <span>Voluntariados</span>
          </div>
          <div className="profile-summary-stat">
            <strong>{myStudentSpots.length}</strong>
            <span>Estudiantiles</span>
          </div>
          <div className="profile-summary-stat">
            <strong>{mySavedJobs.length}</strong>
            <span>Guardadas</span>
          </div>
        </div>

        {/* TABS */}
        <div className="panel-tabs" style={{ marginTop: '20px' }}>
          <button
            className={`panel-tab ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            💼 Empleos ({myApplications.length})
          </button>
          <button
            className={`panel-tab ${activeTab === 'volunteer' ? 'active' : ''}`}
            onClick={() => setActiveTab('volunteer')}
          >
            🤝 Voluntariado ({myVolunteerSpots.length})
          </button>
          <button
            className={`panel-tab ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            🎓 Estudiantes ({myStudentSpots.length})
          </button>
          <button
            className={`panel-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            ♥ Guardadas ({mySavedJobs.length})
          </button>
        </div>

        <div className="panel-grid">
          <div className="panel-block">

            {/* EMPLEOS */}
            {activeTab === 'jobs' && (
              <>
                <h2>Mis Postulaciones a Empleos</h2>
                <div className="panel-list">
                  {myApplications.length > 0 ? (
                    myApplications.map(app => (
                      <div key={app.id} className="panel-item">
                        <div className="panel-item-info">
                          <h4>{app.jobTitle}</h4>
                          <p>{app.orgName} · Enviado: {app.date}</p>
                          <p style={{ fontSize: '11px', color: 'var(--g2)' }}>
                            CV adjunto: {app.cvName}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span
                            className={`panel-badge ${
                              app.status === 'Pendiente'
                                ? 'pend'
                                : app.status === 'Aprobado para Entrevista'
                                ? 'aprob'
                                : 'deneg'
                            }`}
                          >
                            {app.status}
                          </span>
                          <button
                            className="btn-panel-action"
                            onClick={() =>
                              setConfirmRetire({
                                kind: 'job',
                                id: app.id,
                                title: app.jobTitle
                              })
                            }
                          >
                            Retirar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="profile-empty">
                      <p>Aún no te has postulado a ninguna vacante laboral.</p>
                      <button className="btn-vol-apply" onClick={() => navigateTo('jobs')}>
                        Explorar vacantes
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* VOLUNTARIADO */}
            {activeTab === 'volunteer' && (
              <>
                <h2>Mis Voluntariados Activos</h2>
                <div className="panel-list">
                  {myVolunteerSpots.length > 0 ? (
                    myVolunteerSpots.map(spot => (
                      <div key={spot.id} className="panel-item">
                        <div className="panel-item-info">
                          <h4>{spot.title}</h4>
                          <p>{spot.org} · {spot.location}</p>
                        </div>
                        <button
                          className="btn-panel-action"
                          onClick={() =>
                            setConfirmRetire({
                              kind: 'volunteer',
                              id: spot.id,
                              title: spot.title
                            })
                          }
                        >
                          Retirar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="profile-empty">
                      <p>No te has postulado como voluntario.</p>
                      <button className="btn-vol-apply" onClick={() => navigateTo('volunteers')}>
                        Ver oportunidades
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ESTUDIANTES */}
            {activeTab === 'student' && (
              <>
                <h2>Mis Postulaciones Estudiantiles</h2>
                <div className="panel-list">
                  {myStudentSpots.length > 0 ? (
                    myStudentSpots.map(spot => (
                      <div key={spot.id} className="panel-item">
                        <div className="panel-item-info">
                          <h4>{spot.title}</h4>
                          <p>{spot.org} · {spot.location}</p>
                          <p style={{ fontSize: '11px', color: 'var(--g2)' }}>
                            {spot.tipo === 'social' ? '🤝 Voluntariado social' : '🎓 Práctica profesional'}
                          </p>
                        </div>
                        <button
                          className="btn-panel-action"
                          onClick={() =>
                            setConfirmRetire({
                              kind: 'student',
                              id: spot.id,
                              title: spot.title
                            })
                          }
                        >
                          Retirar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="profile-empty">
                      <p>No te has postulado a oportunidades para estudiantes.</p>
                      <button className="btn-vol-apply" onClick={() => navigateTo('students')}>
                        Ver oportunidades
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* GUARDADAS */}
            {activeTab === 'saved' && (
              <>
                <h2>Vacantes Guardadas</h2>
                <div className="panel-list">
                  {mySavedJobs.length > 0 ? (
                    mySavedJobs.map(job => (
                      <div key={job.id} className="panel-item">
                        <div className="panel-item-info">
                          <h4>{job.title}</h4>
                          <p>{job.org} · {job.location}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            className="btn-panel-action"
                            onClick={() => navigateTo('detail', job)}
                          >
                            Ver vacante
                          </button>
                          <button
                            className="btn-panel-action"
                            onClick={() => {
                              toggleSaveJob(job.id);
                            }}
                            style={{ borderColor: '#C0392B', color: '#C0392B' }}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="profile-empty">
                      <p>No tienes vacantes guardadas todavía.</p>
                      <button className="btn-vol-apply" onClick={() => navigateTo('jobs')}>
                        Explorar vacantes
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

          <div className="panel-block" style={{ height: 'fit-content' }}>
            <h2>Mis Documentos</h2>
            {uploadedCVName ? (
              <div style={{ border: '1.5px solid var(--c100)', borderRadius: 'var(--rad)', padding: '15px' }}>
                <p style={{ fontWeight: '700', fontSize: '13px', color: 'var(--gd)' }}>📄 {uploadedCVName}</p>
                <p style={{ fontSize: '11px', color: 'var(--c400)', marginTop: '4px' }}>Cargado automáticamente</p>
                <button
                  className="btn-panel-action"
                  onClick={() => { setUploadedCVName(''); showToast('✓ CV eliminado del sistema'); }}
                  style={{ marginTop: '12px', width: '100%', borderColor: '#C0392B', color: '#C0392B' }}
                >
                  Eliminar Currículum
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '15px', border: '1.5px dashed var(--c200)', borderRadius: 'var(--rad)' }}>
                <p style={{ fontSize: '12px', color: 'var(--c400)', marginBottom: '10px' }}>No tienes ningún currículum activo.</p>
                <button
                  className="btn-vol-apply"
                  onClick={() => { setUploadedCVName('Curriculum_Bolsa_FQA.pdf'); showToast('✓ CV subido correctamente'); }}
                >
                  Subir CV temporal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteOwnAccount />

      {/* CONFIRMAR RETIRO */}
      {confirmRetire && (
        <div className="modal-overlay" onClick={() => setConfirmRetire(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Retirar postulación</h3>
            <p>
              ¿Estás seguro de que deseas retirar tu postulación a{' '}
              <strong>{confirmRetire.title}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-confirm" onClick={handleConfirmRetire}>
                Sí, retirar
              </button>
              <button className="modal-btn-cancel" onClick={() => setConfirmRetire(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
