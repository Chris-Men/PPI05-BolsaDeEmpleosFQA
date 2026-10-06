# Gestión y ciclo de vida de usuarios

## Autorización

El panel conserva su navegación interna. El backend valida roles y permisos actuales en PostgreSQL; la interfaz oculta acciones no permitidas.

| Acción | Candidato | Administrador | Super Admin |
| --- | --- | --- | --- |
| Eliminar la propia cuenta desde el perfil | Sí | Endpoint propio disponible | Cuenta protegida |
| Consultar/crear candidatos | No | Sí | Sí |
| Editar identidad/roles | No | No | Candidatos y administradores |
| Deshabilitar, rehabilitar y eliminar | No | Solo candidatos con un único rol | Candidatos y administradores |
| Consultar y restaurar eliminados | No | No | Sí |

Las cuentas Super Admin siguen protegidas, incluso si tienen otros roles. El panel impide acciones sobre la propia cuenta. Los administradores no pueden afectar cuentas con rol Administrador o Super Admin, aunque también tengan Candidato.

Permisos: `candidates.read/create` para consulta/creación; `users.read/update` para consulta global/edición de Super Admin; `administrators.create` para crear administradores. El ciclo de vida añade `accounts.delete.own`, `candidates.status.update`, `candidates.delete`, `users.status.update` y `users.restore`. Para borrar administradores se reutiliza `administrators.delete`. Restauración y cambios sobre administradores exigen explícitamente Super Admin además del permiso.

No hay permisos individuales ni restablecimiento de contraseñas.

## API

Todas las operaciones requieren `Authorization: Bearer <JWT vigente>`. Las mutaciones también requieren `X-FQA-Request: 1`; cuando existe `Origin`, debe coincidir con `CORS_ORIGIN`. Respuestas privadas con `Cache-Control: no-store`.

| Método y ruta | Entrada | Resultado |
| --- | --- | --- |
| GET /api/admin/users | search, role, status, deleted, page, pageSize | 200: items, total, page, pageSize |
| POST /api/admin/users | fullName, email, password, role | 201: usuario |
| PATCH /api/admin/users/:id | Uno o más de fullName, email, role | 200: usuario |
| PATCH /api/admin/users/:id/status | `{ "status": "ACTIVE" }` o DISABLED | 204 |
| DELETE /api/admin/users/:id | `{ "confirmDeletion": true }` | 204 |
| POST /api/admin/users/:id/restore | `{}` | 204 |
| DELETE /api/auth/me | `{ "confirmDeletion": true }` | 204 y borrado de cookie |

Listado: página 1 y 20 registros por defecto; máximo 100; orden por ID ascendente. Búsqueda por nombre/correo. `deleted=false` (predeterminado) excluye eliminados; `deleted=true` devuelve solo eliminados y exige Super Admin. Administrador solo recibe cuentas cuyo único rol es Candidato; filtros no amplían ese alcance. Estados: ACTIVE y DISABLED. Roles de creación: CANDIDATE o ADMINISTRATOR según autorización.

Cada fila devuelve únicamente `id, fullName, email, roles, status, createdAt, deletedAt`. Las filas eliminadas muestran el correo con prefijo y su fecha de eliminación. La restauración utiliza el correo original derivado de quitar exactamente un prefijo.

Crear/editar conserva las reglas del registro: nombre de 2 a 150 caracteres, correo válido hasta 255 caracteres normalizado, contraseña de 12 caracteres Unicode a 72 bytes UTF-8. Contraseña únicamente en creación, almacenada con bcrypt. Crear otra cuenta no cambia la sesión del operador. PATCH conserva roles si se omiten; un rol explícito reemplaza los anteriores. Cambiar correo o rol revoca sesiones.

Los cuerpos son estrictos: no se permite eliminar mediante PATCH, restaurar mediante cambio de estado ni aportar correo/rol/contraseña durante la restauración. Errores: 400 entrada inválida; 401 sesión inválida; 403 acción prohibida; 404 objetivo inexistente; 409 correo ocupado, estado incompatible o conflicto concurrente.

## Deshabilitación, borrado y restauración

- Deshabilitar mantiene el correo reservado y deleted_at null. Impide login, renovación y acceso autenticado. Si la contraseña es correcta, login informa que la cuenta está deshabilitada y solicita contactar al administrador. Una contraseña incorrecta conserva el error genérico.
- Rehabilitar solo opera sobre cuentas no eliminadas. Permite un nuevo login, sin revivir sesiones previas.
- Eliminar es un **borrado lógico**: añade exactamente `inactive.` al correo, informa deleted_at y establece Deshabilitado. Conserva ID, perfil, roles, contraseña y relaciones/historial.
- Repetir DELETE sobre la misma cuenta eliminada no vuelve a añadir el prefijo.
- El correo original queda libre para registrarse de nuevo. Varias cuentas eliminadas pueden compartir el mismo correo prefijado.
- Solo Super Admin restaura. Se elimina un prefijo, se limpia deleted_at y la cuenta vuelve a Activo, con su identidad y datos anteriores.
- Si otra cuenta no eliminada usa el correo original, incluso si está deshabilitada, restaurar devuelve 409 sin alterar ninguna cuenta.
- Todas las transiciones revocan sesiones en la misma transacción que el cambio y su auditoría. Restaurar requiere iniciar sesión otra vez.

El perfil y el panel muestran **dos confirmaciones consecutivas y cancelables** antes del DELETE. Por decisión de producto, ambas advertencias presentan la eliminación como irreversible y no mencionan roles administrativos ni restauración. El comportamiento técnico sigue siendo borrado lógico con restauración restringida, según las reglas anteriores. Un fallo de red mantiene visible el error y permite reintentar sin declarar éxito.

Las acciones CREATE, UPDATE, DISABLE, ENABLE, DELETE y RESTORE quedan en AuditLogs, con operador y valores públicos afectados. No se registran contraseñas, hashes ni tokens.

## Migración y entorno

La migración `20260916180622_user_lifecycle` conserva el histórico y todas las cuentas. Amplía email a 264 caracteres (255 originales más el prefijo), reemplaza la unicidad global por:

```sql
CREATE UNIQUE INDEX "users_email_live_key"
ON "users"("email") WHERE "deleted_at" IS NULL;
```

Así PostgreSQL protege la unicidad incluso ante registro y restauración concurrentes. El login consulta correo junto con deleted_at null. Las filas históricas eliminadas reciben el prefijo una sola vez al aplicar esta migración.

Prisma 6 no representa índices parciales en schema.prisma. El cambio base se genera con Prisma Migrate y se complementa con SQL documentado para este índice, siguiendo el [flujo oficial para funciones no soportadas](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features). El esquema referencia esta restricción en el campo email. Conservar el índice en futuras migraciones; no sustituirlo por una unicidad global ni usar db push como reemplazo de las migraciones.

Primero validar en PostgreSQL exclusiva de pruebas (`TEST_DATABASE_URL`, nombre terminado en `_test`, distinta de desarrollo):

```sh
cd backend
npm run test:integration
```

Después, desde la raíz, actualizar el entorno local:

```sh
docker compose -f docker-compose.dev.yml exec backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml exec backend npm run prisma:generate
docker compose -f docker-compose.dev.yml exec backend npm run prisma:seed
docker compose -f docker-compose.dev.yml restart backend frontend
```

Aplicar migración, cliente y catálogos antes de utilizar los nuevos endpoints. El seed no contiene cuentas ni credenciales. No se modificaron archivos de infraestructura.

## Verificación

Ambos proyectos: test, typecheck, lint y build. Integración PostgreSQL: matriz de permisos, roles mixtos/protegidos, revocación de JWT y refresh, auditoría, reuso sucesivo del correo, prefijos originales, longitud máxima, conflictos de restauración, carreras de registro/restauración y rechazo de campos no permitidos.

Navegador en escritorio y móvil: deshabilitar/rehabilitar, dos advertencias y cancelación en perfil/panel, errores recuperables, restauración y restricción de acciones por rol. Las cuentas de diagnóstico y las operaciones destructivas de verificación usan exclusivamente la base aislada.
