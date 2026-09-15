/** Validation detail returned by the API for an invalid request. */
export interface ApiValidationError {
  field: string;
  message: string;
}

/** Error raised for an unsuccessful API response. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly validationErrors: ApiValidationError[];

  constructor(message: string, status: number, validationErrors: ApiValidationError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

const apiBaseUrl = (import.meta.env?.VITE_API_URL ?? '/api').replace(
  /\/$/,
  '',
);

/** Returns true when a value is a non-null JSON object. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Sends a typed JSON request to the configured API. */
export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError('No fue posible conectar con el servidor. Inténtalo de nuevo.', 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : 'No fue posible completar la solicitud.';
    const validationErrors =
      isRecord(payload) && Array.isArray(payload.errors)
        ? payload.errors.filter(
            (item): item is ApiValidationError =>
              isRecord(item) &&
              typeof item.field === 'string' &&
              typeof item.message === 'string',
          )
        : [];

    throw new ApiError(message, response.status, validationErrors);
  }

  return payload as TResponse;
}
