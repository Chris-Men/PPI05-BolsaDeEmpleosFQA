import type { Job, NavigateTo, StateSetter } from '../types/models';
import { OpportunityListingLayout, type OpportunityListingControls } from '../components/OpportunityListingLayout';

interface JobsListingProps {
  filteredJobs: Job[];
  selectedJob: Job | null;
  listingControls: OpportunityListingControls;
  navigateTo: NavigateTo;
  setQvJob: StateSetter<Job | null>;
  setQvOpen: StateSetter<boolean>;
  maxSalary: number;
  setMaxSalary: StateSetter<number>;
}

/** Employment opportunities with shared filters and results, without a page banner. */
export default function JobsListing({
  listingControls, filteredJobs, selectedJob, navigateTo, setQvJob, setQvOpen, maxSalary, setMaxSalary,
}: JobsListingProps) {
  return (
    <div className="screen opportunity-screen">
      <OpportunityListingLayout controls={listingControls} salaryFilter={{ maximum: maxSalary, onChange: setMaxSalary }}>
          <div className="jobs-lv">
            {filteredJobs.map(job => (
                <div
                  key={job.id}
                  className={`jrow ${job.isFqa ? 'fqa' : ''} ${selectedJob?.id === job.id ? 'sel' : ''}`}
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
              ))}
          </div>
      </OpportunityListingLayout>
    </div>
  );
}
