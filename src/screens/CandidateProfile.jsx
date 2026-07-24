import React from 'react';

export default function CandidateProfile({ 
  currentUser, 
  handleLogout, 
  applications, 
  setApplications, 
  volunteerApps, 
  setVolunteerApps, 
  volunteerSpots, 
  uploadedCVName, 
  setUploadedCVName, 
  showToast 
}) {
  return (
    <div className="screen">
      <div className="panel-container">
        <div className="panel-header">
          <div>
            <h1>Hola, {currentUser?.name}</h1>
            <p style={{ color: 'var(--c400)', fontSize: '13px' }}>Candidato registrado · Correo: {currentUser?.email}</p>
          </div>
          <button className="btn-panel-action" onClick={handleLogout} style={{ borderColor: '#C0392B', color: '#C0392B' }}>
            Cerrar Sesión
          </button>
        </div>

        <div className="panel-grid">
          <div className="panel-block">
            <h2>Mis Postulaciones a Empleos</h2>
            <div className="panel-list">
              {applications.filter(app => app.candidateEmail === currentUser?.email).length > 0 ? (
                applications.filter(app => app.candidateEmail === currentUser?.email).map(app => (
                  <div key={app.id} className="panel-item">
                    <div className="panel-item-info">
                      <h4>{app.jobTitle}</h4>
                      <p>{app.orgName} · Enviado: {app.date}</p>
                      <p style={{ fontSize: '11px', color: 'var(--g2)' }}>CV adjunto: {app.cvName}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span className={`panel-badge ${app.status === 'Pendiente' ? 'pend' : app.status === 'Aprobado para Entrevista' ? 'aprob' : 'deneg'}`}>
                        {app.status}
                      </span>
                      <button 
                        className="btn-panel-action" 
                        onClick={() => {
                          setApplications(prev => prev.filter(a => a.id !== app.id));
                          showToast('Postulación retirada exitosamente');
                        }}
                      >
                        Retirar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--c400)' }}>Aún no te has postulado a ninguna vacante laboral.</p>
              )}
            </div>

            <h2 style={{ marginTop: '30px' }}>Mis Voluntariados Activos</h2>
            <div className="panel-list">
              {volunteerApps.length > 0 ? (
                volunteerSpots.filter(spot => volunteerApps.includes(spot.id)).map(spot => (
                  <div key={spot.id} className="panel-item">
                    <div className="panel-item-info">
                      <h4>{spot.title}</h4>
                      <p>{spot.org} · {spot.location}</p>
                    </div>
                    <button 
                      className="btn-panel-action"
                      onClick={() => {
                        setVolunteerApps(prev => prev.filter(id => id !== spot.id));
                        showToast('✓ Postulación de voluntariado retirada');
                      }}
                    >
                      Retirar
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--c400)' }}>No te has postulado como voluntario.</p>
              )}
            </div>
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
    </div>
  );
}
