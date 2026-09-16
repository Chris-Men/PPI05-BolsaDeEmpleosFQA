/** Field-level validation information returned by the backend. */
export interface ApiValidationError { field: string; message: string }

/** Typed API failure with localized text and safe validation details. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly validationErrors: ApiValidationError[];
  constructor(message: string, status: number, validationErrors: ApiValidationError[] = []) {
    super(message); this.name = 'ApiError'; this.status = status; this.validationErrors = validationErrors;
  }
}

/** Authentication is explicit; public failures must not trigger token renewal. */
interface ApiRequestOptions extends RequestInit { authenticated?: boolean; retryAuthentication?: boolean }

/** Callbacks avoid coupling the HTTP transport to React or the session store. */
interface AuthenticationTransport {
  getToken: () => string | undefined;
  refresh: () => Promise<void>;
  invalidate: () => void;
}
let authentication: AuthenticationTransport | undefined;

/** Connects the session lifecycle to authenticated requests. */
export const configureAuthentication = (transport: AuthenticationTransport): void => {
  authentication = transport;
};

const apiBaseUrl = (import.meta.env?.VITE_API_URL ?? '/api').replace(/\/$/, '');
/** Narrows untrusted JSON for safe error parsing. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Sends typed JSON; retries an authenticated 401 once, never a 403. */
export async function apiRequest<TResponse>(
  path: string, options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { authenticated = false, retryAuthentication = true, ...requestOptions } = options;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const headers = new Headers(requestOptions.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-FQA-Request', '1');
    const requestToken = authenticated ? authentication?.getToken() : undefined;
    if (requestToken) headers.set('Authorization', 'Bearer ' + requestToken);
    let response: Response;
    try {
      response = await fetch(apiBaseUrl + path, { ...requestOptions, headers, credentials: 'include' });
    } catch {
      throw new ApiError('No fue posible conectar con el servidor. Inténtalo de nuevo.', 0);
    }
    if (response.status === 401 && authenticated && retryAuthentication && authentication && attempt === 0) {
      await response.arrayBuffer();
      if (authentication.getToken() === requestToken) await authentication.refresh();
      continue;
    }
    if (response.status === 204) return undefined as TResponse;
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && authenticated && authentication?.getToken() === requestToken) {
        authentication?.invalidate();
      }
      const message = isRecord(payload) && typeof payload.message === 'string'
        ? payload.message : 'No fue posible completar la solicitud.';
      const errors = isRecord(payload) && Array.isArray(payload.errors)
        ? payload.errors.filter((item): item is ApiValidationError =>
          isRecord(item) && typeof item.field === 'string' && typeof item.message === 'string') : [];
      throw new ApiError(message, response.status, errors);
    }
    return payload as TResponse;
  }
  throw new ApiError('La sesión no es válida. Inicia sesión nuevamente.', 401);
}
