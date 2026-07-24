import React from 'react';

export default function AdminDashboard({ 
  currentUser, 
  handleLogout, 
  adminTab, 
  setAdminTab, 
  jobs, 
  setJobs, 
  newJobForm, 
  setNewJobForm, 
  handleCreateJob, 
  handleAdminDeleteJob, 
  applications, 
  handleUpdateAppStatus 
}) {
  return (
    <div className="screen">
      <div className="panel-container">
        <div className="panel-header">
          <div>
            <h1>Panel Administrativo de Control</h1>
            <p style={{ color: 'var(--c400)', fontSize: '13px' }}>Nivel de Acceso: Administrador FQA</p>
          </div>
          <button className="btn-panel-action" onClick={handleLogout} style={{ borderColor: '#C0392B', color: '#C0392B' }}>
            Cerrar Sesión Admin
          </button>
        </div>

        <div className="panel-tabs">
          <button 
            className={`panel-tab ${adminTab === 'vacantes' ? 'active' : ''}`}
            onClick={() => setAdminTab('vacantes')}
          >
            Gestionar Vacantes ({jobs.length})
          </button>
          <button 
            className={`panel-tab ${adminTab === 'candidatos' ? 'active' : ''}`}
            onClick={() => setAdminTab('candidatos')}
          >
            Revisar Candidatos ({applications.length})
          </button>
        </div>

        <div className="panel-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
          {adminTab === 'vacantes' && (
            <>
              <div className="panel-block">
                <h2>Listado de Vacantes Activas</h2>
                <div className="panel-list">
                  {jobs.map(job => (
                    <div key={job.id} className="panel-item">
                      <div className="panel-item-info">
                        <h4>{job.title}</h4>
                        <p>{job.org} · {job.location}</p>
                      </div>
                      <button className="btn-panel-action" onClick={() => handleAdminDeleteJob(job.id)}>
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-block">
                <h2>Publicar Nueva Vacante</h2>
                <form onSubmit={handleCreateJob}>
                  <div className="admin-form-full">
                    <label>Título de la vacante *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ej. Coordinador de Proyecto"
                      value={newJobForm.title}
                      onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-full">
                      <label>Organización *</label>
                      <input 
                        type="text" 
                        required 
                        value={newJobForm.org}
                        onChange={(e) => setNewJobForm({ ...newJobForm, org: e.target.value })}
                      />
                    </div>
                    <div className="admin-form-full">
                      <label>Ubicación *</label>
                      <input 
                        type="text" 
                        required 
                        value={newJobForm.location}
                        onChange={(e) => setNewJobForm({ ...newJobForm, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-full">
                      <label>Área *</label>
                      <select 
                        value={newJobForm.area}
                        onChange={(e) => setNewJobForm({ ...newJobForm, area: e.target.value })}
                      >
                        <option>Educación</option>
                        <option>Salud</option>
                        <option>Bienestar Social</option>
                        <option>Medio Ambiente</option>
                        <option>Autonomía Económica</option>
                      </select>
                    </div>
                    <div className="admin-form-full">
                      <label>Jornada *</label>
                      <select 
                        value={newJobForm.type}
                        onChange={(e) => setNewJobForm({ ...newJobForm, type: e.target.value })}
                      >
                        <option>Tiempo completo</option>
                        <option>Medio tiempo</option>
                        <option>Contrato</option>
                        <option>Remoto</option>
                      </select>
                    </div>
                  </div>
                  <div className="admin-form-full">
                    <label>Salario mensual *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ej. $650 - $800/mes"
                      value={newJobForm.salary}
                      onChange={(e) => setNewJobForm({ ...newJobForm, salary: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-full">
                    <label>Descripción general *</label>
                    <textarea 
                      required 
                      placeholder="Describe las tareas del rol..."
                      value={newJobForm.desc}
                      onChange={(e) => setNewJobForm({ ...newJobForm, desc: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-full">
                    <label>Responsabilidades (Separar por coma)</label>
                    <input 
                      type="text" 
                      placeholder="Responsabilidad 1, Responsabilidad 2..."
                      value={newJobForm.responsibilities}
                      onChange={(e) => setNewJobForm({ ...newJobForm, responsibilities: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-full">
                    <label>Requisitos básicos (Separar por coma)</label>
                    <input 
                      type="text" 
                      placeholder="Requisito 1, Requisito 2..."
                      value={newJobForm.requirements}
                      onChange={(e) => setNewJobForm({ ...newJobForm, requirements: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-admin-submit">Crear Vacante Oficial</button>
                </form>
              </div>
            </>
          )}

          {adminTab === 'candidatos' && (
            <div className="panel-block" style={{ gridColumn: '1 / -1' }}>
              <h2>Revisión de Postulantes</h2>
              <div className="panel-list">
                {applications.map(app => (
                  <div key={app.id} className="panel-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid var(--c50)', paddingBottom: '10px', marginBottom: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: 'var(--gd)' }}>{app.candidateName}</strong>
                        <p style={{ fontSize: '12px', color: 'var(--c400)' }}>Correo: {app.candidateEmail} · Tel: {app.phone}</p>
                      </div>
                      <span className={`panel-badge ${app.status === 'Pendiente' ? 'pend' : app.status === 'Aprobado para Entrevista' ? 'aprob' : 'deneg'}`}>
                        {app.status}
                      </span>
                    </div>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--c400)' }}>Puesto aplicado:</span>
                        <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{app.jobTitle}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--g2)' }}>CV Adjunto: {app.cvName}</p>
                      </div>
                      <div>
                        <button 
                          className="btn-admin-choice" 
                          onClick={() => handleUpdateAppStatus(app.id, 'Aprobado para Entrevista')}
                        >
                          Aprobar Entrevista
                        </button>
                        <button 
                          className="btn-admin-choice deny" 
                          onClick={() => handleUpdateAppStatus(app.id, 'Postulación Denegada')}
                        >
                          Denegar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
