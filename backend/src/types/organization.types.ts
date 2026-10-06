import type { OrganizationStatusCode } from '../constants/organization.constants.js';

/** Public organization data, excluding internal relations and catalog IDs. */
export interface ManagedOrganization {
  id: number;
  name: string;
  description: string | null;
  email: string | null;
  status: OrganizationStatusCode;
  createdAt: string | null;
}

/** Stable page of organizations and the total matching the same filters. */
export interface OrganizationListResponse {
  items: ManagedOrganization[];
  total: number;
  page: number;
  pageSize: number;
}
