/** Role assigned exclusively by the public candidate registration service. */
export const CANDIDATE_ROLE_CODE = 'CANDIDATE';

/** Initial lifecycle state for accounts that do not require email verification. */
export const ACTIVE_USER_STATUS_CODE = 'ACTIVE';

/** Work factor used for asynchronous bcrypt password hashing. */
export const PASSWORD_HASH_ROUNDS = 12;

/** Access-token lifetime in seconds, shared by JWT signing and the API response. */
export const ACCESS_TOKEN_TTL_SECONDS = 3600;
