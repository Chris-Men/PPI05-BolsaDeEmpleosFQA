import { SaveOpportunityButton } from '../components/users/SaveOpportunityButton';
import type { Job } from '../types/models';

interface JobDetailProps {
  selectedJob: Job;
  onApply: () => void;
}

/** Employment detail keeps saving in the header and application in the position summary. */
export default function JobDetail({
  selectedJob, onApply,
}: JobDetailProps) {
  return (
    <div className="screen">
      <div className="d-hero">
        <div className="dh-glow"></div>
        <div className="dh-left">
         
          <div className="dh-info">
            <h2>{selectedJob.title}</h2>
            <p className="dh-org">{selectedJob.org} · {selectedJob.location}, El Salvador</p>
            <div className="dh-badges">
              <span className="dh-badge">📚 {selectedJob.area}</span>
              <span className="dh-badge">⏱ {selectedJob.type}</span>
            </div>
          </div>
        </div>
        <div className="dh-right">
          <SaveOpportunityButton opportunityKey={selectedJob.opportunityKey ?? 'job-' + selectedJob.id} className="btn-save-h" />
        </div>
      </div>

      <div className="d-body">
        <div className="d-content">
          <div className="d-sec">
            <p className="d-sec-t">Sobre el rol</p>
            <p>{selectedJob.desc}</p>
          </div>

          {selectedJob.responsibilities.length > 0 && (
            <div className="d-sec">
              <p className="d-sec-t">Responsabilidades principales</p>
              <ul className="d-list">
                {selectedJob.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {selectedJob.requirements.length > 0 && (
            <div className="d-sec">
              <p className="d-sec-t">Perfil requerido</p>
              <ul className="d-list">
                {selectedJob.requirements.map((req, i) => <li key={i}>{req}</li>)}
              </ul>
            </div>
          )}

          {selectedJob.offers.length > 0 && (
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
              <div className="mrow"><span className="ml">Sector</span><span className="mv">{selectedJob.area}</span></div>
              <button className="ds-apply" onClick={onApply}>Aplicar ahora →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
