import type { StateSetter, VolunteerSpot } from '../types/models';

interface VolunteersProps {
  volunteerSpots: VolunteerSpot[];
  volunteerApps: number[];
  setSelectedOrg: StateSetter<VolunteerSpot | null>;
  handleVolunteerApplyClick: (spot: VolunteerSpot) => void;
}

/** List of demonstration volunteer opportunities. */
export default function Volunteers({
  volunteerSpots, volunteerApps, setSelectedOrg, handleVolunteerApplyClick,
}: VolunteersProps) {
  return (
    <div className="screen">
      <div className="v-hero">
        <h1>Bolsa de Voluntariados</h1>
        <p>Genera un cambio directo sumándote a los esfuerzos locales en nuestros albergues y comunidades aliadas en todo el país.</p>
      </div>

      <div className="volunteer-grid">
        {volunteerSpots.map(spot => (
          <div key={spot.id} className="volunteer-card" onClick={() => setSelectedOrg(spot)}>
            <div className="vol-slots">🔥 {spot.slots} cupos disponibles</div>
            <h3 className="vol-title">{spot.title}</h3>
            <div className="vol-org">🏢 {spot.org}</div>
            <p className="vol-desc">{spot.desc}</p>
            <div className="vol-meta-row">
              <span>📍 {spot.location}</span>
              <span>📚 {spot.area}</span>
            </div>
            <button 
              className="btn-vol-apply" 
              onClick={(e) => { e.stopPropagation(); handleVolunteerApplyClick(spot); }}
              style={{ marginTop: '15px' }}
              disabled={volunteerApps.includes(spot.id)}
            >
              {volunteerApps.includes(spot.id) ? 'Postulado ✓' : 'Postularme'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
