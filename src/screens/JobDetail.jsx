import React from 'react';

export default function JobDetail({ 
  selectedJob, 
  savedJobs, 
  toggleSaveJob, 
  navigateTo, 
  setFormStep 
}) {
  return (
    <div className="screen">
      <div className="d-hero">
        <div className="dh-glow"></div>
        <div className="dh-left">
          <div className="dh-logo">
            <svg viewBox="0 0 40 40" fill="none" width="38" height="38">
              <circle cx="20" cy="8" r="5.5" stroke="#82BA2E" strokeWidth="2.3"/>
              <path d="M10 16c0-5.5 4.5-8 10-8s10 2.5 10 8" stroke="#82BA2E" strokeWidth="2.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="dh-info">
            <h2>{selectedJob.title}</h2>
            <p className="dh-org">{selectedJob.org} · {selectedJob.location}, El Salvador</p>
            <div className="dh-badges">
              <span className="dh-badge">📚 {selectedJob.area}</span>
              <span className="dh-badge">⏱ {selectedJob.type}</span>
              <span className="dh-badge">👁 {selectedJob.views} visualizaciones</span>
            </div>
            <div className="compat-wrap">
              <div className="compat-lbl">Compatibilidad con tu perfil</div>
              <div className="compat-track-d">
                <div className="compat-fill-d" style={{ width: `${selectedJob.compat}%` }}></div>
              </div>
              <div className="compat-pct-d">{selectedJob.compat}% de compatibilidad estimada</div>
            </div>
          </div>
        </div>
        <div className="dh-right">
          <button className="btn-apply-h" onClick={() => { setFormStep(1); navigateTo('form'); }}>Aplicar ahora →</button>
          <button className="btn-save-h" onClick={() => toggleSaveJob(selectedJob.id)}>
            {savedJobs.includes(selectedJob.id) ? '♥ Guardado' : '♡ Guardar vacante'}
          </button>
        </div>
      </div>

      <div className="d-body">
        <div className="d-content">
          <div className="d-sec">
            <p className="d-sec-t">Sobre el rol</p>
            <p>{selectedJob.desc}</p>
          </div>

          {selectedJob.responsibilities && (
            <div className="d-sec">
              <p className="d-sec-t">Responsabilidades principales</p>
              <ul className="d-list">
                {selectedJob.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {selectedJob.requirements && (
            <div className="d-sec">
              <p className="d-sec-t">Perfil requerido</p>
              <ul className="d-list">
                {selectedJob.requirements.map((req, i) => <li key={i}>{req}</li>)}
              </ul>
            </div>
          )}

          {selectedJob.offers && (
            <div className="d-sec">
              <p className="d-sec-t">Lo que ofrecemos</p>
              <ul className="d-list">
                {selectedJob.offers.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="d-sidebar">
          <div className="ds-sticky">
            <div className="ds-block">
              <p className="ds-t">Resumen del puesto</p>
              <div className="mrow"><span className="ml">Salario</span><span className="mv">{selectedJob.salary}</span></div>
              <div className="mrow"><span className="ml">Jornada</span><span className="mv">{selectedJob.type}</span></div>
              <div className="mrow"><span className="ml">Ubicación</span><span className="mv">{selectedJob.location}</span></div>
              <div className="mrow"><span className="ml">Sector</span><span className="mv">{selectedJob.area} / ONG</span></div>
              <button className="ds-apply" onClick={() => { setFormStep(1); navigateTo('form'); }}>Aplicar ahora →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
