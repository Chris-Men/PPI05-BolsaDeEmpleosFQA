import React from 'react';

export default function Home({ 
  jobs, 
  savedJobs, 
  toggleSaveJob, 
  navigateTo, 
  setQvJob, 
  setQvOpen, 
  searchQuery, 
  setSearchQuery, 
  searchLocation, 
  setSearchLocation, 
  setSelectedArea 
}) {
  return (
    <div className="screen">
      <div className="hero">
        <div className="hero-glow hero-glow-1"></div>
        <div className="hero-glow hero-glow-2"></div>
        <div className="hero-eyebrow">
          <span className="hero-dot"></span> Bolsa de Trabajo Social · El Salvador
        </div>
        <h1>Trabaja donde tu<br />historia <em>importa.</em></h1>
        <p className="hero-sub">Conectamos profesionales comprometidos con organizaciones que generan impacto real en comunidades de El Salvador y Centroamérica.</p>
        
        <div className="hero-search">
          <input 
            type="text" 
            placeholder="Puesto, habilidad o palabra clave…" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar vacantes" 
          />
          <div className="hero-vdiv"></div>
          <select 
            aria-label="Ubicación"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
          >
            <option value="Todo el país">Todo el país</option>
            <option value="San Salvador">San Salvador</option>
            <option value="Santa Ana">Santa Ana</option>
            <option value="San Miguel">San Miguel</option>
            <option value="Remoto">Remoto</option>
          </select>
          
          <button className="hero-search-btn" onClick={() => navigateTo('jobs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <circle cx="11" cy="11" r="7"/>
              <path d="M20 20l-3.5-3.5" strokeLinecap="round"/>
            </svg>
            Buscar
          </button>
        </div>

        <div className="hero-stats">
          <div className="hero-stat"><strong>{jobs.length}</strong><span>Vacantes activas</span></div>
          <div className="hero-stat"><strong>24</strong><span>Organizaciones</span></div>
          <div className="hero-stat"><strong>2,400+</strong><span>Candidatos</span></div>
          <div className="hero-stat"><strong>5</strong><span>Ejes de impacto</span></div>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div className="trust-strip">
        <span className="trust-lbl">Organizaciones que confían</span>
        <div className="trust-orgs">
          <span className="trust-org">CARITAS ES</span>
          <span className="trust-org">Cruz Roja SV</span>
          <span className="trust-org">World Vision</span>
          <span className="trust-org">Fe y Alegría</span>
          <span className="trust-org">Save the Children</span>
        </div>
      </div>

      {/* EXPLORE AREAS */}
      <div className="areas-strip">
        <h3>Explorar por área de impacto</h3>
        <div className="areas-row">
          {['Todos', 'Salud', 'Educación', 'Bienestar Social', 'Medio Ambiente', 'Autonomía Económica'].map(area => (
            <div 
              key={area} 
              className="area-pill"
              onClick={() => { setSelectedArea(area); navigateTo('jobs'); }}
            >
              {area}
            </div>
          ))}
        </div>
      </div>

      {/* STUDENTS PROMO */}
<div className="section-wrap">
  <div className="students-banner" onClick={() => navigateTo('students')}>
    <div className="students-banner-text">
      <span className="students-banner-eyebrow">🎓 Para estudiantes</span>
      <h3>¿Buscas voluntariado o práctica profesional?</h3>
      <p>Descubre oportunidades diseñadas para estudiantes que quieren ganar experiencia y aportar a comunidades salvadoreñas.</p>
    </div>
    <button className="students-banner-btn">
      Ver oportunidades
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  </div>
</div>

      {/* FEATURED JOBS */}
      <div className="section-wrap">
        <div className="section-hd">
          <h2>Vacantes destacadas</h2>
          <span onClick={() => navigateTo('jobs')}>Ver las {jobs.length} vacantes →</span>
        </div>

        <div className="jobs-grid">
          {jobs.slice(0, 6).map(job => (
            <div key={job.id} className={`jcard ${job.isFqa ? 'fqa-f' : ''}`} onClick={() => navigateTo('detail', job)}>
              <div className="jcard-top">
                <div className="org-logo" style={{background: job.isFqa ? 'var(--g)' : 'var(--gd)'}}>
                  <svg viewBox="0 0 28 28" fill="none" width="24" height="24">
                    <circle cx="14" cy="5.5" r="3.8" stroke="#fff" strokeWidth="2"/>
                    <path d="M7 11c0-4 3-6 7-6s7 2 7 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 19l4 6 4-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="jcard-actions">
                  <button className="jcard-quick" onClick={(e) => { e.stopPropagation(); setQvJob(job); setQvOpen(true); }} title="Vista rápida">👁</button>
                  <button className={`jcard-save ${savedJobs.includes(job.id) ? 'saved' : ''}`} onClick={(e) => { e.stopPropagation(); toggleSaveJob(job.id); }}>
                    {savedJobs.includes(job.id) ? '♥' : '♡'}
                  </button>
                </div>
              </div>
              <div>
                <h4>{job.title}</h4>
                <p className="jcard-org">{job.org} · {job.location}</p>
              </div>
              <div className="tags">
                <span className="tag tag-area">{job.area}</span>
                <span className="tag tag-type">{job.type}</span>
                {job.isNew && <span className="tag tag-new">Nueva</span>}
                {job.isHot && <span className="tag tag-hot">🔥 Popular</span>}
                {job.isUrgent && (
                  <div className="urgent-badge">
                    <span className="urgent-dot"></span>Urgente
                  </div>
                )}
              </div>
              <div className="jcard-footer">
                <span className="jcard-salary">{job.salary}</span>
                <div className="jcard-meta">
                  <span className="jcard-date">{job.date}</span>
                  {job.closing && <span className="jcard-closing">{job.closing}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IMPACT BAND */}
      <div className="stats-band">
        <div className="stats-inner">
          <div className="sstat"><strong>12,000+</strong><span>Personas beneficiadas</span></div>
          <div className="sstat"><strong>{jobs.length}</strong><span>Vacantes activas</span></div>
          <div className="sstat"><strong>24</strong><span>Organizaciones aliadas</span></div>
          <div className="sstat"><strong>5</strong><span>Ejes de impacto</span></div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <svg viewBox="0 0 36 36" fill="none" width="30">
              <circle cx="18" cy="7.5" r="4.5" stroke="#82BA2E" strokeWidth="2.2"/>
              <path d="M9.5 14.5c0-5 4-8 8.5-8s8.5 3 8.5 8" stroke="#82BA2E" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M13.5 26l4.5 6.5 4.5-6.5" stroke="#82BA2E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Transformando su manera de pensar para cambiar su manera de vivir.</p>
          </div>
          <div className="footer-col">
            <h5>Empleos</h5>
            <span onClick={() => navigateTo('jobs')}>Todas las vacantes</span>
            <span onClick={() => navigateTo('volunteers')}>Bolsa de Voluntariado</span>
          </div>
          <div className="footer-col">
            <h5>Nosotros</h5>
            <span onClick={() => navigateTo('nosotros')}>Nuestra visión</span>
          </div>
          <div className="footer-col">
            <h5>Contacto</h5>
            <span>proyectos@fundaqa.org</span>
            <span>7623 4832</span>
            <span>San Salvador, El Salvador</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Fundación Quintanilla Amaya. Todos los derechos reservados.</span>
          <span className="footer-hash">#ConectamosConHistorias</span>
        </div>
      </footer>
    </div>
  );
}
