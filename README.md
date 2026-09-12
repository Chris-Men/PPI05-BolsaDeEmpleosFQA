# FQA Empleos

Monorepo de la bolsa de empleo de FQA. Incluye una aplicación React, una API REST Express con Prisma y PostgreSQL, y la configuración de contenedores para DigitalOcean.

## Requisitos

- Node.js 22 y npm 10, o Docker Desktop.
- Copiar `.env.example` a `.env` en la raíz y sustituir todos los valores de ejemplo por valores seguros.
- `JWT_SECRET` debe ser un secreto aleatorio de al menos 32 caracteres. Los archivos `.env` nunca se incluyen en Git.

## Desarrollo con Docker Compose

Ejecutar desde la raíz, con Docker Desktop iniciado. La primera instalación requiere preparar la base, generar el cliente y cargar los catálogos antes de registrar usuarios:

```bash
docker compose up -d --wait postgres
docker compose run --build --rm --no-deps backend npm ci
docker compose run --rm --no-deps backend npm run prisma:generate
docker compose run --rm --no-deps backend npm run prisma:deploy
docker compose run --rm --no-deps backend npm run prisma:seed
docker compose up --build -d backend frontend
```

La interfaz queda disponible en `http://localhost:5173`, la API en `http://localhost:3000/api` y la comprobación de salud en `http://localhost:3000/api/health`.

La migración inicial corresponde a una base nueva. No ejecutar resets para adaptar una base que ya contenga datos: primero se debe revisar su compatibilidad. La carga de catálogos es idempotente y conserva los identificadores al volver a ejecutarse.

En posteriores arranques, usar `docker compose up --build`. Si cambian dependencias, volver a ejecutar `npm ci` en el servicio backend; si cambia Prisma, regenerar el cliente y aplicar las migraciones.

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

Esta historia incorpora las tablas `users`, `user_profiles`, `roles` y `user_statuses`. Los identificadores son `cuid`; cada cuenta tiene un rol y un estado. El registro crea un perfil con nombre completo. Los catálogos iniciales contienen los roles candidato, organización y administrador, y el estado activo.

El registro público de organizaciones, verificación de correo, inicio de sesión independiente, renovación de tokens, permisos y edición del perfil se implementarán en otras historias.

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
docker compose exec postgres createdb -U fqa_user fqa_empleos_test
```

Adaptar el usuario si `POSTGRES_USER` tiene otro valor. Esta creación se ejecuta una sola vez. Configurar `TEST_DATABASE_URL` en `backend/.env` o como variable del proceso, y ejecutar desde `backend`:

```bash
npm run test:integration
```

El script exige un nombre de base terminado en `_test` y distinto del configurado en `DATABASE_URL`. No usa la base de desarrollo como alternativa. Aplica las migraciones existentes, carga los catálogos y crea un secreto JWT temporal para las pruebas.

La suite comprueba persistencia real, hash, JWT, catálogos idempotentes, duplicados, concurrencia, rechazo de privilegios y reversión ante un fallo de firma. Elimina únicamente las cuentas creadas por esa ejecución y sus perfiles; no reinicia ni vacía la base.

## Git

La rama de producción es `main`; las ramas de trabajo nacen desde `dev` con formato `feature/JIRA-123-descripcion` o `fix/JIRA-123-descripcion`. Esta entrega es local en `feature/candidate-registration`; aún no existe repositorio GitHub ni una base de commits.

## Producción

El Droplet debe contener el repositorio en `/opt/fqa-empleos`, un archivo `.env` exclusivo del servidor y acceso de lectura a GHCR. El workflow de producción requiere los secretos `DROPLET_HOST`, `DROPLET_USER` y `DROPLET_SSH_KEY` antes de habilitarse.
