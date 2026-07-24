import React from 'react';

export default function JobsListing({ 
  filteredJobs, 
  selectedJob, 
  navigateTo, 
  setQvJob, 
  setQvOpen, 
  searchQuery, 
  setSearchQuery, 
  selectedArea, 
  setSelectedArea, 
  maxSalary, 
  setMaxSalary,
  showToast
}) {
  return (
    <div className="screen">
      <div className="listing-wrap">
        {/* SIDEBAR FILTERS */}
        <aside className="l-aside">
          <div className="aside-hd">
            FILTROS
            <button onClick={() => { setSelectedArea('Todos'); setMaxSalary(1500); showToast('🔄 Filtros reiniciados'); }}>Limpiar</button>
          </div>
          <div className="fg">
            <p className="fg-lbl">Área de impacto</p>
            <div className="ftags">
              {['Todos', 'Salud', 'Educación', 'Bienestar Social', 'Medio Ambiente', 'Autonomía Económica'].map(area => (
                <span 
                  key={area} 
                  className={`ftag ${selectedArea === area ? 'on' : ''}`} 
                  onClick={() => setSelectedArea(area)}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="fg">
            <p className="fg-lbl">Salario mensual máximo</p>
            <div className="range-wrap">
              <input 
                type="range" 
                min="200" 
                max="1500" 
                step="50"
                value={maxSalary} 
                onChange={(e) => setMaxSalary(parseInt(e.target.value))} 
              />
              <div className="range-val">$200–${maxSalary}</div>
            </div>
          </div>
          <div className="aside-div"></div>
          <div className="fg">
            <p className="fg-lbl">Publicado</p>
            <div className="ftags">
              <span className="ftag on">Cualquier momento</span>
              <span className="ftag">Esta semana</span>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="l-main">
          <div className="l-topbar">
            <div className="srch-inline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A9866" strokeWidth="2.5">
                <circle cx="11" cy="11" r="7"/>
                <path d="M20 20l-3.5-3.5" strokeLinecap="round"/>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar por título, habilidad u organización…" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className="res-info"><strong>{filteredJobs.length}</strong> resultados</span>
          </div>

          <div className="jobs-lv">
            {filteredJobs.length > 0 ? (
              filteredJobs.map(job => (
                <div 
                  key={job.id} 
                  className={`jrow ${job.isFqa ? 'fqa' : ''} ${selectedJob.id === job.id ? 'sel' : ''}`} 
                  onClick={() => navigateTo('detail', job)}
                >
                  <div className="jr-logo" style={{background: job.isFqa ? 'var(--g)' : 'var(--gd)'}}>
                    <svg viewBox="0 0 28 28" fill="none" width="24" height="24">
                      <circle cx="14" cy="5.5" r="3.8" stroke="#fff" strokeWidth="2"/>
                      <path d="M7 11c0-4 3-6 7-6s7 2 7 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="jr-info">
                    {job.isFqa && <div><span className="jr-b">Destacada FQA</span></div>}
                    <div className="jr-t">{job.title}</div>
                    <div className="jr-o">{job.org} · {job.location}</div>
                    <div className="tags">
                      <span className="tag tag-area">{job.area}</span>
                      <span className="tag tag-type">{job.type}</span>
                    </div>
                  </div>
                  <div className="jr-right">
                    <div className="jr-sal">{job.salary}</div>
                    <div className="jr-d">{job.date}</div>
                    <button className="jr-qv" onClick={(e) => { e.stopPropagation(); setQvJob(job); setQvOpen(true); }}>
                      Vista rápida →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{padding: '40px', textAlign: 'center', color: 'var(--c400)'}}>
                No se encontraron vacantes con los criterios de búsqueda actuales.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
