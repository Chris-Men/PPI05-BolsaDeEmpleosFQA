import type {
  StateSetter, StudentOpportunityType, StudentSpot,
} from '../types/models';
import { OpportunityListingLayout, type OpportunityListingControls } from '../components/OpportunityListingLayout';

interface StudentsProps {
  listingControls: OpportunityListingControls;
  studentSpots: StudentSpot[];
  studentApps: number[];
  activeStudentTab: StudentOpportunityType;
  setActiveStudentTab: StateSetter<StudentOpportunityType>;
  handleStudentApplyClick: (spot: StudentSpot) => void;
  onView: (key: string) => void;
}

/** Student tabs and cards retain their layout with shared filters below the banner. */
export default function Students({
  listingControls, studentSpots, studentApps, activeStudentTab, setActiveStudentTab,
  handleStudentApplyClick, onView,
}: StudentsProps) {
  const filteredSpots = studentSpots.filter(
    spot => spot.tipo === activeStudentTab
  );

  return (
    <div className="screen opportunity-screen">

      {/* HERO */}
      <div className="v-hero">
        <h1>Oportunidades para Estudiantes</h1>
        <p>
          Encuentra oportunidades de horas sociales y prácticas profesionales
          para desarrollar tu experiencia y contribuir al desarrollo social.
        </p>
      </div>

      {/* TABS */}
      <div className="student-listing-tabs">
        <div className="panel-tabs">
          <button
            className={`panel-tab ${
              activeStudentTab === 'social' ? 'active' : ''
            }`}
            onClick={() => setActiveStudentTab('social')}
          >
            🤝 Horas Sociales
          </button>

          <button
            className={`panel-tab ${
              activeStudentTab === 'practica' ? 'active' : ''
            }`}
            onClick={() => setActiveStudentTab('practica')}
          >
            🎓 Prácticas Profesionales
          </button>
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <div className="student-listing-description">
        {activeStudentTab === 'social' ? (
          <div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '800',
                color: 'var(--gd)',
                marginBottom: '6px'
              }}
            >
              Horas Sociales
            </h2>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--c400)',
                marginBottom: '0'
              }}
            >
              Participa en actividades de impacto social y pon tus
              conocimientos al servicio de comunidades que lo necesitan.
            </p>
          </div>
        ) : (
          <div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '800',
                color: 'var(--gd)',
                marginBottom: '6px'
              }}
            >
              Prácticas Profesionales
            </h2>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--c400)',
                marginBottom: '0'
              }}
            >
              Desarrolla experiencia profesional aplicando tus conocimientos
              en organizaciones del sector social.
            </p>
          </div>
        )}
      </div>

      {/* TARJETAS */}
      <OpportunityListingLayout controls={listingControls}>
      <div className="volunteer-grid">

        {filteredSpots.map(spot => {
          const alreadyApplied = studentApps.includes(spot.id);

          return (
            <div
              key={spot.id}
              className="volunteer-card"
            >

              {/* CUPOS / TIPO */}
              <div className="vol-slots">
                {spot.tipo === 'social'
                  ? '🤝 Horas sociales disponibles'
                  : '🎓 Práctica disponible'}
              </div>

              {/* TÍTULO */}
              <h3 className="vol-title">
                {spot.title}
              </h3>

              {/* ORGANIZACIÓN */}
              <div className="vol-org">
                🏢 {spot.org}
              </div>

              {/* DESCRIPCIÓN */}
              <p className="vol-desc">
                {spot.desc}
              </p>

              {/* INFORMACIÓN */}
              <div className="vol-meta-row">
                <span>
                  📍 {spot.location}
                </span>

                <span>
                  📚 {spot.area}
                </span>
              </div>

              {/* INFORMACIÓN ADICIONAL */}
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--c400)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '-5px'
                }}
              >
                {spot.horas && (
                  <span>
                    ⏱️ {spot.horas} horas
                  </span>
                )}

                {spot.duracion && (
                  <span>
                    📅 {spot.duracion}
                  </span>
                )}
              </div>

              {/* POSTULACIÓN */}
              <button type="button" className="btn-vol-apply" onClick={() => { if (spot.opportunityKey) onView(spot.opportunityKey); }}>Ver detalles</button>
              <button
                className="btn-vol-apply"
                onClick={() => handleStudentApplyClick(spot)}
                style={{ marginTop: '15px' }}
                disabled={alreadyApplied}
              >
                {alreadyApplied
                  ? 'Postulado ✓'
                  : 'Postularme'}
              </button>

            </div>
          );
        })}

      </div>
      </OpportunityListingLayout>

    </div>
  );
}
