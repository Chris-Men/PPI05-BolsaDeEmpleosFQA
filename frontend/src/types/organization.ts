/** Public organization contract shared with the administrative API. */
export interface ManagedOrganization {
  id: number;
  name: string;
  description: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string | null;
}

/** Server-side organization pagination and filters. */
export interface OrganizationFilters {
  search: string;
  status: '' | ManagedOrganization['status'];
  page: number;
  pageSize: number;
}

/** Stable paginated response from the organization API. */
export interface OrganizationListResponse {
  items: ManagedOrganization[];
  total: number;
  page: number;
  pageSize: number;
}

/** Editable fields; lifecycle state is changed separately. */
export interface OrganizationInput {
  name: string;
  description: string | null;
  email: string | null;
}
