import type {
  StateSetter, StudentOpportunityType, StudentSpot,
} from '../types/models';

interface StudentsProps {
  studentSpots: StudentSpot[];
  studentApps: number[];
  activeStudentTab: StudentOpportunityType;
  setActiveStudentTab: StateSetter<StudentOpportunityType>;
  handleStudentApplyClick: (spot: StudentSpot) => void;
}

/** Student volunteering and internship opportunities. */
export default function Students({
  studentSpots, studentApps, activeStudentTab, setActiveStudentTab,
  handleStudentApplyClick,
}: StudentsProps) {
  const filteredSpots = studentSpots.filter(
    spot => spot.tipo === activeStudentTab
  );

  return (
    <div className="screen">

      {/* HERO */}
      <div className="v-hero">
        <h1>Oportunidades para Estudiantes</h1>
        <p>
          Encuentra oportunidades de voluntariado y prácticas profesionales
          para desarrollar tu experiencia y contribuir al desarrollo social.
        </p>
      </div>

      {/* TABS */}
      <div style={{ padding: '24px 48px 0' }}>
        <div className="panel-tabs">
          <button
            className={`panel-tab ${
              activeStudentTab === 'social' ? 'active' : ''
            }`}
            onClick={() => setActiveStudentTab('social')}
          >
            🤝 Voluntariado Social
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
      <div style={{ padding: '0 48px' }}>
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
              Voluntariado Social
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
                  ? '🤝 Voluntariado disponible'
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

      {/* SIN RESULTADOS */}
      {filteredSpots.length === 0 && (
        <div
          style={{
            padding: '50px',
            textAlign: 'center',
            color: 'var(--c400)'
          }}
        >
          <h3
            style={{
              color: 'var(--gd)',
              marginBottom: '8px'
            }}
          >
            No hay oportunidades disponibles
          </h3>

          <p>
            Actualmente no existen oportunidades en esta categoría.
          </p>
        </div>
      )}

    </div>
  );
}