import React, { useState } from 'react';
import { SaveOpportunityButton } from '../components/users/SaveOpportunityButton';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { initialSiteConfiguration } from '../config/siteConfiguration';
import { SiteSocialLinks } from '../components/users/SiteSocialLinks';
import { telephoneHref, whatsappHref } from '../utils/siteLinks';
import type { Job, NavigateTo, StateSetter } from '../types/models';
import type { PublicOpportunityStatistics } from '../types/opportunity';
import homeDesktop from '../components/imagenes/img/home.png';
import homeMobile from '../components/imagenes/img/home-responsive.png';

interface HomeProps {
  jobs: Job[];
  categories: string[];
  total: number;
  statistics: PublicOpportunityStatistics | null;
  statisticsError: string;
  onRetryStatistics: () => void;
  listingLoading: boolean;
  listingError: string;
  onRetryListing: () => void;
  navigateTo: NavigateTo;
  setQvJob: StateSetter<Job | null>;
  setQvOpen: StateSetter<boolean>;
  onSearch: (query: string, location: string, area?: string) => void;
}

/** Homepage con imagen de fondo en el hero, texto superpuesto, buscador y métricas reales. */
export default function Home({
  categories, total, jobs, navigateTo, setQvJob, setQvOpen,
  statistics, statisticsError, onRetryStatistics, listingLoading, listingError, onRetryListing, onSearch,
}: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('Todo el país');
  const { configuration } = useSiteSettings();
  const { inicio, contacto } = configuration;
  /** Pending or unavailable statistics remain unknown rather than showing invented counts. */
  const metric = (value: number | undefined): string => value === undefined ? '—' : value.toLocaleString('es-SV');

  return (
    <div className="screen">
      {/* HERO: IMAGEN DE FONDO + CONTENIDO SUPERPUESTO */}
      <section className="hero-banner">
        <picture>
          <source media="(max-width: 900px)" srcSet={homeMobile} />
          <img
            className="hero-banner-img"
            src={homeDesktop}
            alt="Equipo de la Bolsa de Trabajo Social"
            decoding="async"
          />
        </picture>

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-dot"></span> Bolsa de Trabajo Social · El Salvador
          </div>

          <h1>
            {inicio.titulo === initialSiteConfiguration.inicio.titulo
              ? <>Trabaja donde tu<br />historia <em>importa.</em></>
              : inicio.titulo}
          </h1>
          {inicio.subtitulo && <p className="hero-sub">{inicio.subtitulo}</p>}
          {inicio.descripcion && <p className="hero-sub site-home-description">{inicio.descripcion}</p>}

          <form
            className="hero-search"
            onSubmit={(event) => { event.preventDefault(); onSearch(searchQuery, searchLocation); }}
          >
            <input
              type="text"
              placeholder="Puesto, habilidad o palabra clave…"
              value={searchQuery}
              maxLength={150}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar vacantes"
            />
            <div className="hero-vdiv"></div>
            <select
              aria-label="Ubicación"
              value={searchLocation}
              onChange={(event) => setSearchLocation(event.target.value)}
            >
              <option value="Todo el país">Todo el país</option>
              <option value="San Salvador">San Salvador</option>
              <option value="Santa Ana">Santa Ana</option>
              <option value="San Miguel">San Miguel</option>
              <option value="Remoto">Remoto</option>
            </select>

            <button type="submit" className="hero-search-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              Buscar
            </button>
          </form>

          <div className="hero-stats" aria-live="polite">
            <div className="hero-stat"><strong>{metric(statistics?.activeOpportunities)}</strong><span>Vacantes activas</span></div>
            <div className="hero-stat"><strong>{metric(statistics?.organizations)}</strong><span>Organizaciones</span></div>
            <div className="hero-stat"><strong>{metric(statistics?.candidates)}</strong><span>Candidatos</span></div>
            <div className="hero-stat"><strong>{metric(statistics?.impactAxes)}</strong><span>Ejes de impacto</span></div>
          </div>
          {statisticsError && (
            <p className="home-statistics-error" role="alert">
              {statisticsError} <button type="button" onClick={onRetryStatistics}>Reintentar estadísticas</button>
            </p>
          )}
        </div>
      </section>

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
          {['Todos', ...categories].map(area => (
            <div
              key={area}
              className="area-pill"
              onClick={() => onSearch(searchQuery, searchLocation, area)}
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
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* FEATURED JOBS */}
      <div className="section-wrap">
        <div className="section-hd">
          <h2>Vacantes destacadas</h2>
          <span onClick={() => onSearch('', 'Todo el país')}>Ver las {total} vacantes →</span>
        </div>

        <div className="jobs-grid">
          {listingLoading && <p className="home-listing-message" role="status">Cargando vacantes…</p>}
          {listingError && (
            <p className="home-listing-message" role="alert">
              {listingError} <button type="button" onClick={onRetryListing}>Reintentar</button>
            </p>
          )}
          {!listingLoading && !listingError && !jobs.length && (
            <p className="home-listing-message">Todavía no hay vacantes publicadas.</p>
          )}
          {!listingLoading && !listingError && jobs.slice(0, 6).map(job => (
            <div key={job.id} className={`jcard ${job.isFqa ? 'fqa-f' : ''}`} onClick={() => navigateTo('detail', job)}>
              <div className="jcard-top">
                <div>
                  <h4>{job.title}</h4>
                  <p className="jcard-org">{job.org} · {job.location}</p>
                </div>
                <div className="jcard-actions">
                  <button
                    className="jcard-quick"
                    onClick={(e) => { e.stopPropagation(); setQvJob(job); setQvOpen(true); }}
                    title="Vista rápida"
                  >
                    👁
                  </button>
                  <SaveOpportunityButton
                    opportunityKey={job.opportunityKey ?? 'job-' + job.id}
                    className="jcard-save"
                    variant="icon"
                  />
                </div>
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
          <div className="sstat"><strong>{metric(statistics?.candidates)}</strong><span>Candidatos</span></div>
          <div className="sstat"><strong>{metric(statistics?.activeOpportunities)}</strong><span>Vacantes activas</span></div>
          <div className="sstat"><strong>{metric(statistics?.organizations)}</strong><span>Organizaciones aliadas</span></div>
          <div className="sstat"><strong>{metric(statistics?.impactAxes)}</strong><span>Ejes de impacto</span></div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
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
            {contacto.correo && <a href={'mailto:' + contacto.correo}>{contacto.correo}</a>}
            {contacto.telefono && <a href={telephoneHref(contacto.telefono)}>{contacto.telefono}</a>}
            {contacto.direccion && <span>{contacto.direccion}</span>}
            {contacto.whatsapp && (
              <a href={whatsappHref(contacto.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            )}
            <SiteSocialLinks />
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © 2026 Fundación Quintanilla Amaya.
            <br />
            Todos los derechos reservados.
          </span>

          <a
            href="/colaboradores"
            className="footer-collaborators"
            onClick={(event) => {
              event.preventDefault();
              navigateTo('collaborators');
              window.history.pushState({}, '', '/colaboradores');
            }}
          >
            Proyecto realizado en colaboración con estudiantes de la ULS
          </a>

          <span className="footer-hash">
            #ConectamosConHistorias
          </span>
        </div>
      </footer>
    </div>
  );
}
