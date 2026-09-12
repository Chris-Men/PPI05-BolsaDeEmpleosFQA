/** Requires an explicitly named test database, never a development fallback. */
export const requireTestDatabaseUrl = (
  testDatabaseUrl: string | undefined,
  developmentDatabaseUrl: string | undefined,
): string => {
  if (!testDatabaseUrl) {
    throw new Error('Define TEST_DATABASE_URL para una base PostgreSQL exclusiva de pruebas.');
  }

  let target: URL;

  try {
    target = new URL(testDatabaseUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL no es una URL válida de PostgreSQL.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !/^\/[a-zA-Z0-9_]+_test$/.test(target.pathname)
  ) {
    throw new Error('TEST_DATABASE_URL debe apuntar a PostgreSQL y a una base cuyo nombre termine en _test.');
  }

  if (developmentDatabaseUrl) {
    let development: URL;

    try {
      development = new URL(developmentDatabaseUrl);
    } catch {
      throw new Error('DATABASE_URL no es válida; comprueba la separación de las bases.');
    }

    // Compare names even across host aliases to avoid accidentally using development.
    if (decodeURIComponent(development.pathname) === target.pathname) {
      throw new Error('La base de pruebas debe tener un nombre distinto al de desarrollo.');
    }
  }

  return testDatabaseUrl;
};
