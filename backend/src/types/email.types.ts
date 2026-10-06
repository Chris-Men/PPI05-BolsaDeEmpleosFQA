/** Opportunity categories supported by future application APIs. */
export type OpportunityType = 'EMPLEO' | 'VOLUNTARIADO' | 'HORAS_SOCIALES' | 'PRACTICA';

/** Email messages persisted in the encrypted outbox. */
export type EmailPayload =
  | { kind: 'PASSWORD_RESET'; token: string }
  | { kind: 'PASSWORD_CHANGED' }
  | {
    kind: 'APPLICATION_SUBMITTED';
    candidateName: string;
    opportunityTitle: string;
    opportunityType: OpportunityType;
    referenceNumber?: string;
  }
  | {
    kind: 'APPLICATION_DECIDED';
    candidateName: string;
    opportunityTitle: string;
    opportunityType: OpportunityType;
    decision: 'APPROVED' | 'REJECTED';
    referenceNumber?: string;
  };

/** Data required by the future application service at transaction commit. */
export interface ApplicationEmailInput {
  eventKey: string;
  recipientEmail: string;
  candidateName: string;
  opportunityTitle: string;
  opportunityType: OpportunityType;
  referenceNumber?: string;
}

/** A rendered, text-only message suitable for SMTP delivery. */
export interface RenderedEmail { subject: string; text: string }
