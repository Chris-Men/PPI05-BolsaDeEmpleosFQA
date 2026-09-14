# FQA Empleos

Monorepo de la bolsa de empleo de FQA. Incluye una aplicación React, una API REST Express con Prisma y PostgreSQL, y la configuración de contenedores para DigitalOcean.

## Requisitos

- Node.js 22 y npm 10, o Docker Desktop.
- Copiar `.env.example` a `.env` en la raíz y sustituir todos los valores de ejemplo por valores seguros.
- `JWT_SECRET` debe ser un secreto aleatorio de al menos 32 caracteres. Los archivos `.env` nunca se incluyen en Git.

## Desarrollo con Docker Compose

El archivo `docker-compose.dev.yml` configura el desarrollo local. El archivo predeterminado `docker-compose.yml` configura producción.

Ejecutar desde la raíz, con Docker Desktop iniciado. La primera instalación requiere preparar la base, generar el cliente y cargar los catálogos antes de registrar usuarios:

```bash
docker compose -f docker-compose.dev.yml up -d --wait postgres
docker compose -f docker-compose.dev.yml run --build --rm --no-deps backend npm ci
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:generate
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:seed
docker compose -f docker-compose.dev.yml up --build -d backend frontend
```

La interfaz queda disponible en `http://localhost:5173`, la API en `http://localhost:3000/api` y la comprobación de salud en `http://localhost:3000/api/health`.

La migración inicial corresponde a una base nueva. No ejecutar resets para adaptar una base que ya contenga datos: primero se debe revisar su compatibilidad. La carga de catálogos es idempotente y conserva los identificadores al volver a ejecutarse.

En posteriores arranques, usar `docker compose -f docker-compose.dev.yml up --build`. Si cambian dependencias, volver a ejecutar `npm ci` en el servicio backend; si cambia Prisma, regenerar el cliente y aplicar las migraciones.

## Backend ejecutado en el equipo

Copiar `backend/.env.example` a `backend/.env` y ajustar las credenciales a las de PostgreSQL. La conexión local usa `localhost`; dentro de Compose utiliza el nombre de servicio `postgres`.

Desde `backend`:

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Para futuras modificaciones del modelo, generar migraciones con `npm run prisma:migrate -- --name descripcion_del_cambio`. No editar manualmente el histórico de `prisma/migrations`.

## Registro de candidatos

`POST /api/auth/register` recibe JSON y no requiere autenticación previa:

```json
{
  "fullName": "Ana Rivera",
  "email": "ana@example.com",
  "password": "Una clave de ejemplo 2026"
}
```

| Campo | Regla |
| --- | --- |
| `fullName` | Obligatorio, entre 2 y 150 caracteres después de recortar espacios exteriores. |
| `email` | Obligatorio y válido; se recorta y convierte a minúsculas antes de guardar. |
| `password` | Obligatoria, al menos 12 caracteres Unicode y como máximo 72 bytes UTF-8; no se recorta ni transforma. |

No se aceptan otros campos. El backend asigna siempre el rol `CANDIDATE` y el estado `ACTIVE`. La contraseña se almacena exclusivamente como hash bcrypt con coste 12.

Ejemplo con PowerShell:

```powershell
$registration = @{
  fullName = 'Ana Rivera'
  email = 'ana@example.com'
  password = 'Una clave de ejemplo 2026'
} | ConvertTo-Json

$result = Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:3000/api/auth/register' `
  -ContentType 'application/json' `
  -Body $registration
```

Respuesta **201 Created** (identificador, fecha y token ilustrativos):

```json
{
  "user": {
    "id": "cmexamplecandidate",
    "fullName": "Ana Rivera",
    "email": "ana@example.com",
    "role": "CANDIDATE",
    "status": "ACTIVE",
    "createdAt": "2026-09-10T00:00:00.000Z"
  },
  "accessToken": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

El JWT usa HS256 y contiene `sub` (identificador del usuario), `role`, `iat` y `exp`. Su vigencia es de una hora; `expiresIn` se expresa en segundos. La respuesta lleva `Cache-Control: no-store`. No registrar ni compartir el token.

La creación del usuario, el perfil y la preparación del JWT ocurren en una transacción. Si falla un paso, no se confirma la cuenta. Los correos duplicados se resuelven con la restricción única de PostgreSQL, incluso ante solicitudes simultáneas.

| Estado HTTP | Significado |
| --- | --- |
| 400 | Campos ausentes o inválidos, campos adicionales o JSON mal formado. |
| 409 | Ya existe una cuenta con el correo normalizado. |
| 413 | El cuerpo supera el límite JSON de Express de 100 KB. |
| 500 | Error interno; se devuelve un mensaje genérico sin detalles sensibles. |

Ejemplo de validación:

```json
{
  "message": "Los datos de registro no son válidos.",
  "errors": [
    {
      "field": "email",
      "message": "El correo electrónico no es válido."
    }
  ]
}
```

Para errores generales, la respuesta contiene únicamente `message`. Los mensajes están en español y nunca incluyen la contraseña ni su hash.

Las cuentas usan identificadores enteros, un estado y una o varias asignaciones en `user_roles`. El registro público crea un perfil y asigna exclusivamente Candidato y el estado Activo; no acepta roles ni permisos enviados por el cliente.

## Roles y permisos — PB-91

La matriz canónica está en `backend/src/constants/authorization.constants.ts`. El seed sincroniza `roles`, `permissions` y `role_permissions` en una transacción; conserva identificadores y elimina permisos obsoletos de los roles canónicos. Retira el rol Organización y sus asignaciones sin eliminar usuarios existentes ni registros de `organizations`. Las organizaciones no tienen una cuenta propia: las añaden los administradores.

| Operación | Permiso | Candidato | Administrador | Super Admin |
| --- | --- | :---: | :---: | :---: |
| Consultar su perfil | `profiles.read.own` | Sí | — | — |
| Modificar su perfil | `profiles.update.own` | Sí | — | — |
| Cargar CV en su perfil | `profiles.resume.upload.own` | Sí | — | — |
| Postularse | `applications.create.own` | Sí | — | — |
| Consultar sus postulaciones | `applications.read.own` | Sí | — | — |
| Cargar CV en sus postulaciones | `applications.resume.upload.own` | Sí | — | — |
| Crear candidatos | `candidates.create` | — | Sí | Sí |
| Consultar candidatos | `candidates.read` | — | Sí | Sí |
| Revisar CV de perfiles | `profiles.resume.read.any` | — | Sí | Sí |
| Revisar CV de postulaciones | `applications.resume.read.any` | — | Sí | Sí |
| Publicar oportunidades | `opportunities.create` | — | Sí | Sí |
| Revisar postulaciones | `applications.read.any` | — | Sí | Sí |
| Seleccionar candidatos | `applications.select` | — | Sí | Sí |
| Añadir organizaciones | `organizations.create` | — | Sí | Sí |
| Crear administradores | `administrators.create` | — | — | Sí |
| Eliminar administradores | `administrators.delete` | — | — | Sí |
| Crear respaldo de la DB | `database.backup` | — | — | Sí |
| Restaurar respaldo de la DB | `database.restore` | — | — | Sí |

`opportunities.create` cubre empleos, prácticas, voluntariados y horas sociales. Hay **18 permisos** y **26 asignaciones**: 6 para Candidato, 8 para Administrador y 12 para Super Admin. No hay un permiso genérico para crear usuarios privilegiados ni para crear otros Super Admin.

### Validación en el backend

- `authenticate` verifica firma HS256, vencimiento e identidad del JWT. Consulta los roles, permisos y estado actuales en la DB en cada solicitud; el claim `role` no concede acceso. Una cuenta eliminada o inactiva recibe 401.
- `requirePermission` aplica el permiso y devuelve 403 si falta. `requireRole` permite exigir un rol concreto. Una ruta que omita autenticación no pasa los validadores.
- `assertOwnPermission` comprueba permiso **y propiedad**. Los servicios deben usar el dueño del recurso leído de la DB, nunca un `userId` enviado por el cliente. Al crear una postulación, se debe asignar el usuario autenticado; al editarla o cargar un CV, comprobar primero su dueño.
- `assertCanCreateAccount` permite a Administrador y Super Admin crear candidatos; solo Super Admin puede crear administradores. No permite crear cuentas Super Admin.
- `assertCanDeleteAdministrator` exige el permiso exclusivo y una cuenta objetivo administradora leída de la DB; rechaza candidatos, Super Admin y la propia cuenta. No se debe confiar en los roles del objetivo enviados en el cuerpo.
- Los cuatro permisos exclusivos requieren también el rol Super Admin, incluso ante una asignación incorrecta en la DB. Super Admin no obtiene permisos implícitos: también necesita el grant correspondiente.
- Los permisos de múltiples roles reconocidos se combinan. Los roles y permisos desconocidos no conceden acceso. La revocación se aplica en la siguiente solicitud, aunque el token siga vigente.

`GET /api/auth/me` exige `Authorization: Bearer <token>` y devuelve únicamente `userId`, `roles` y `permissions`, con `Cache-Control: no-store`. El frontend puede usar esta respuesta para presentar las acciones disponibles; cada operación debe seguir protegida en la API. El diagnóstico de desarrollo `GET /api/debug/users` ahora exige Super Admin y continúa ausente en producción.

Para aplicar el catálogo a la base local:

```bash
docker compose -f docker-compose.dev.yml exec -T backend npm run prisma:seed
```

PB-91 implementa el catálogo y los validadores, no los módulos ni sus pantallas. La creación administrativa de cuentas, publicación de oportunidades, perfiles/CV, selección, backup y restore deben integrar estos validadores cuando se implementen. No se ha creado ninguna cuenta Super Admin ni ejecutado respaldos/restauraciones. La verificación de correo, inicio de sesión independiente y renovación de tokens también quedan para otras historias.

## Pruebas y comprobaciones

Desde `backend`:

```bash
npm run prisma:generate
npm run typecheck
npm run lint
npm run build
npm test
```

Las pruebas unitarias usan `node:test` con `tsx` y no necesitan PostgreSQL. El chequeo de tipos y lint también incluyen pruebas, scripts y carga de catálogos.

Las pruebas de integración requieren una base PostgreSQL **exclusiva de pruebas**. Por ejemplo, con el usuario de ejemplo de Compose:

```bash
docker compose -f docker-compose.dev.yml exec postgres createdb -U fqa_user fqa_empleos_test
```

Adaptar el usuario si `POSTGRES_USER` tiene otro valor. Esta creación se ejecuta una sola vez. Configurar `TEST_DATABASE_URL` en `backend/.env` o como variable del proceso, y ejecutar desde `backend`:

```bash
npm run test:integration
```

El script exige un nombre de base terminado en `_test` y distinto del configurado en `DATABASE_URL`. No usa la base de desarrollo como alternativa. Aplica las migraciones existentes, carga los catálogos y crea un secreto JWT temporal para las pruebas.

La suite comprueba registro y persistencia, hash, JWT, catálogos idempotentes, duplicados, concurrencia, rechazo de privilegios y reversión ante un fallo de firma. También verifica la matriz de autorización mediante HTTP, revocación inmediata, usuarios inactivos/eliminados, roles múltiples, límites de Super Admin y retirada del rol Organización sin pérdida de datos. El ejecutor descubre todos los archivos de integración y los ejecuta secuencialmente para aislar cambios temporales al catálogo. La limpieza se limita a los datos creados por cada ejecución; no reinicia ni vacía la base.

## Git

La rama de producción es `main`; las ramas de trabajo nacen desde `dev` con formato `feature/JIRA-123-descripcion` o `fix/JIRA-123-descripcion`. Esta entrega es local en `feature/candidate-registration`; aún no existe repositorio GitHub ni una base de commits.

## Producción

El Droplet debe contener el repositorio en `/opt/fqa-empleos`, un archivo `.env` exclusivo del servidor y acceso de lectura a GHCR. El workflow de producción requiere los secretos `DROPLET_HOST`, `DROPLET_USER` y `DROPLET_SSH_KEY` antes de habilitarse.
