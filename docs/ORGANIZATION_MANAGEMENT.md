# Gestión de organizaciones

## Acceso y alcance

Admin (`ADMINISTRATOR`) y Super Admin (`SUPER_ADMIN`) tienen las mismas operaciones:
crear, listar, consultar, editar y activar/desactivar organizaciones. El backend exige
tanto un rol administrativo como el permiso vigente almacenado en PostgreSQL.

| Operación | Permiso |
| --- | --- |
| Listar y consultar | `organizations.read` |
| Crear | `organizations.create` |
| Editar datos | `organizations.update` |
| Cambiar estado | `organizations.status.update` |

Candidato y visitantes no tienen acceso. Un permiso asignado por error a Candidato no
permite gestionar organizaciones. Super Admin también necesita el permiso correspondiente.

No se crean cuentas, sesiones ni vinculaciones con usuarios. La relación histórica
`OrganizationUsers` se conserva sin exponerla en la API. No hay eliminación de
organizaciones, aprobación, administración de publicaciones ni integración con frontend.

## Contrato HTTP

Base: `/api/admin/organizations`.

Todas las solicitudes requieren `Authorization: Bearer <JWT vigente>`.
Las mutaciones requieren además `X-FQA-Request: 1`; si se envía `Origin`, debe
coincidir con `CORS_ORIGIN`. Las respuestas autenticadas incluyen
`Cache-Control: no-store`.

| Método y ruta | Entrada | Respuesta |
| --- | --- | --- |
| GET / | search, status, page, pageSize | 200: items, total, page, pageSize |
| GET /:id | ID entero positivo | 200: organización |
| POST / | name, description?, email? | 201: organización activa |
| PATCH /:id | Uno o más de name, description, email | 200: organización |
| PATCH /:id/status | status: ACTIVE o INACTIVE | 204 sin cuerpo |

Cada organización devuelve exclusivamente:

```json
{
  "id": 1,
  "name": "Fundación Ejemplo",
  "description": "Oportunidades para jóvenes",
  "email": "contacto@example.org",
  "status": "ACTIVE",
  "createdAt": "2026-09-17T00:00:00.000Z"
}
```

`description`, `email` y la fecha histórica `createdAt` pueden ser `null`.
Las fechas no nulas se serializan como ISO 8601.

El listado devuelve `{ items, total, page, pageSize }`. Incluye ambos estados por
defecto, ordena por ID ascendente y usa página 1 con 20 resultados. La página máxima
es 1.000.000 y el tamaño permitido es de 1 a 100. `search` admite hasta 255 caracteres
y busca una subcadena en nombre o correo sin distinguir mayúsculas; se combina con
el filtro de estado. Una página sin resultados devuelve `items: []`.

### Validación

- Nombre obligatorio, de 2 a 150 caracteres después de eliminar espacios exteriores.
  Conserva la unicidad y comparación actual de PostgreSQL: las variantes en
  mayúsculas/minúsculas son nombres distintos. Desactivar no libera el nombre.
- Descripción opcional, máximo 5.000 caracteres después de eliminar espacios
  exteriores. Una descripción vacía se guarda como `null`.
- Correo opcional, válido y de máximo 255 caracteres. Se normaliza con
  `trim` y minúsculas. Puede compartirse entre organizaciones; no se compara con
  correos de cuentas de usuario. Se acepta `null` y se rechaza texto vacío.
- En creación, los campos opcionales omitidos quedan en `null`. En edición, omitir
  un campo conserva su valor; enviar `null` limpia descripción o correo.
- PATCH vacío, IDs fuera del rango de enteros positivos PostgreSQL, filtros
  desconocidos y campos ajenos al contrato devuelven 400. El estado solo puede
  cambiarse mediante `/:id/status`, nunca mediante creación o edición general.

### Ejemplos

Crear con `POST /api/admin/organizations`:

```json
{
  "name": "Fundación Ejemplo",
  "description": "Oportunidades para jóvenes",
  "email": "CONTACTO@example.org"
}
```

Consultar con `GET /api/admin/organizations?search=fundaci%C3%B3n&status=ACTIVE&page=1&pageSize=20`.

Quitar el correo con `PATCH /api/admin/organizations/1`:

```json
{ "email": null }
```

Desactivar con `PATCH /api/admin/organizations/1/status`:

```json
{ "status": "INACTIVE" }
```

Para reactivar, enviar `{ "status": "ACTIVE" }` a la misma ruta.

Errores en español: 400 entrada inválida; 401 sesión inválida; 403 acceso prohibido;
404 organización inexistente; 409 nombre ocupado o conflicto concurrente persistente.
La validación sigue el formato existente `{ message, errors: [{ field, message }] }`;
los errores de aplicación usan `{ message }`.

## Estado, concurrencia y auditoría

Los códigos `ACTIVE` e `INACTIVE` corresponden a `Activo` e `Inactivo` en
`OrganizationStatuses`. El seed agrega ambos de forma idempotente, preservando IDs
y registros históricos. Un estado histórico diferente requiere revisión de datos;
la API no lo convierte silenciosamente a activo o inactivo.

Toda organización nueva queda activa. Desactivar solo modifica su estado:
conserva empleos, voluntariados, archivos y relaciones históricas. Sigue siendo
consultable y editable. Esta feature no impone reglas sobre publicación de oportunidades.

Creación, edición y cambios efectivos de estado registran en `AuditLogs`:
`entityType: Organization`, operador, ID, acción `CREATE`, `UPDATE`, `ENABLE` o
`DISABLE`, y valores públicos `before`/`after`. En creación, `before` es `null`.
No se incluyen credenciales ni datos de relaciones.

La escritura y auditoría comparten una transacción serializable. Si falla la
auditoría, se revierte toda la operación. Los conflictos de serialización se
reintentan hasta tres intentos; si persisten, se devuelve 409.
Repetir el estado actual devuelve 204 sin auditoría adicional, incluso ante solicitudes
simultáneas. La unicidad del nombre se garantiza en PostgreSQL, también en concurrencia.

## Migración y verificación

La migración `20260917034325_organization_contact_email`, generada con Prisma Migrate,
añade únicamente `organizations.email VARCHAR(255)` nullable, sin índice único.
Los registros anteriores conservan su identidad y datos, con correo nulo.
No se alteran migraciones anteriores, índices de usuarios ni infraestructura.

Desde la raíz, preparar el backend local antes de utilizar los endpoints:

```sh
docker compose -f docker-compose.dev.yml exec backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml exec backend npm run prisma:generate
docker compose -f docker-compose.dev.yml exec backend npm run prisma:seed
docker compose -f docker-compose.dev.yml restart backend
```

Para otros entornos, aplicar migraciones y catálogos con los comandos existentes de
despliegue antes de servir la nueva API; el seed de producción es
`npm run prisma:seed:production`. El seed sincroniza los nuevos permisos de ambos roles.

Verificación del backend:

```sh
cd backend
npm test
npm run typecheck
npm run lint
npm run build
npm run test:integration
```

La integración exige `TEST_DATABASE_URL` hacia una base PostgreSQL exclusiva cuyo
nombre termine en `_test`, distinta de desarrollo. El runner aplica migraciones y
seed allí; no usar la base de desarrollo ni producción para pruebas.
Las pruebas cubren autorización, validación, filtros, correo compartido, conflictos
de nombre, concurrencia, auditoría transaccional y conservación de relaciones.
