# FQA Empleos

Monorepo de la bolsa de oportunidades de la Fundación Quintanilla Amaya. Contiene una aplicación React, una API REST con Express y Prisma, PostgreSQL y configuraciones Docker para desarrollo y producción.

## Estado actual

- El frontend público incluye empleos, voluntariados, horas sociales, prácticas y perfiles con datos de demostración.
- El registro público consume `POST /api/auth/register` y siempre crea una cuenta con rol `CANDIDATE`.
- El inicio de sesión autentica los tres roles y conserva sesiones revocables durante un máximo de 30 días.
- Administrador y Super Admin acceden al panel existente con identidad real; el módulo Usuarios usa la API y PostgreSQL. Administrador puede consultar, crear, deshabilitar y eliminar candidatos; Super Admin también gestiona administradores y restaura cuentas eliminadas. Los demás módulos de negocio conservan datos de demostración.
- Los permisos de Candidato, Administrador y Super Admin se validan en el backend.

## Arquitectura

```text
Navegador
   │
   ▼
React 19 + TypeScript + Vite
   │ HTTP / JSON
   ▼
Express 5 + TypeScript + JWT
   │ Prisma ORM
   ▼
PostgreSQL 17
```

En desarrollo, el navegador accede directamente a Vite en el puerto `5173` y a la API en el `3000`. La configuración de producción usa Caddy como proxy HTTPS y descarga las imágenes desde GitHub Container Registry.

## Estructura del repositorio

| Ruta | Contenido |
| --- | --- |
| `frontend/` | Aplicación React, componentes, pantallas, servicios HTTP y estilos. |
| `backend/src/` | Rutas, controllers, services, middleware, validación y configuración de la API. |
| `backend/prisma/` | Esquema Prisma, migraciones y seed de catálogos. |
| `infrastructure/caddy/` | Configuración del proxy de producción. |
| `.github/workflows/` | Jobs de CI y despliegue. |
| `docker-compose.dev.yml` | Entorno local con recarga automática. |
| `docker-compose.yml` | Servicios e imágenes de producción. |
| `docs/SETUP.md` | Instalación completa, variables y operación con Docker Compose. |

## Archivos locales que se deben crear

Los archivos con secretos están ignorados por Git. Nunca se deben confirmar en un commit.

| Archivo local | Cuándo se necesita | Plantilla |
| --- | --- | --- |
| `.env` | Siempre que se use Docker Compose, en desarrollo o producción. | `.env.example` |
| `backend/.env` | Solo al ejecutar el backend directamente en el equipo. | `backend/.env.example` |
| `frontend/.env.local` | Solo al ejecutar Vite directamente en el equipo. | `frontend/.env.example` |

Los valores completos y la forma de generar `JWT_SECRET` están documentados en [Instalación y operación](docs/SETUP.md#archivos-locales-y-variables-de-entorno).

## Inicio rápido en desarrollo

Con Docker Desktop iniciado, desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
```

Edita `.env` antes de continuar. Luego ejecuta el procedimiento de primera instalación:

```bash
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d --wait postgres
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:generate
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:seed
docker compose -f docker-compose.dev.yml up -d
```

Servicios disponibles:

| Servicio | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| API | `http://localhost:3000/api` |
| Salud de la API | `http://localhost:3000/api/health` |

En los siguientes arranques, si no cambiaron dependencias ni migraciones:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Consulta [Instalación y operación](docs/SETUP.md) para actualizaciones después de `git pull`, ejecución fuera de Docker, solución del error `Outdated Optimize Dep`, detención segura y producción.

## Registro público de candidatos

`POST /api/auth/register` requiere la cabecera `X-FQA-Request: 1` y recibe únicamente:

```json
{
  "fullName": "Ana Rivera",
  "email": "ana@example.com",
  "password": "Una clave de ejemplo 2026"
}
```

| Campo | Regla |
| --- | --- |
| `fullName` | Entre 2 y 150 caracteres. |
| `email` | Formato válido y máximo de 255 caracteres; se normaliza a minúsculas. |
| `password` | Entre 12 caracteres Unicode y 72 bytes UTF-8. |

Los campos adicionales se rechazan. El backend aplica bcrypt y asigna exclusivamente el rol Candidato y el estado Activo. Un correo repetido devuelve HTTP `409`.

## Roles

| Capacidad | Candidato | Administrador | Super Admin |
| --- | :---: | :---: | :---: |
| Administrar su perfil, CV y postulaciones | Sí | — | — |
| Crear candidatos y gestionar oportunidades, organizaciones y postulaciones | — | Sí | Sí |
| Crear o eliminar administradores | — | — | Sí |
| Backup y restore de la base de datos | — | — | Sí |

La matriz canónica está en `backend/src/constants/authorization.constants.ts`. Las organizaciones no tienen cuentas propias.

## Validación local

Los jobs de CI ejecutan `npm ci`, typecheck, lint y build de frontend y backend. Para reproducirlos:

```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run build

cd ../backend
npm ci
npm run prisma:generate
npm run typecheck
npm run lint
npm test
npm run build
```

Las pruebas de integración del backend necesitan una base separada cuyo nombre termine en `_test`. Su preparación se explica en [Pruebas de integración](docs/SETUP.md#pruebas-de-integración-del-backend).

## Flujo Git

- Las ramas de trabajo nacen desde `dev`.
- Usar `feature/`, `fix/`, `hotfix/` o `chore/` según el tipo de cambio.
- No confirmar `.env`, tokens, contraseñas, certificados ni respaldos.
- La integración a `main` se realiza mediante squash merge.
## Autenticación

Consulta [inicio de sesión y sesiones revocables](docs/AUTHENTICATION.md) para contratos, migración, persistencia, revocación y pruebas de PB-02.

## Gestión de usuarios

Consulta [gestión y ciclo de vida de usuarios](docs/USER_MANAGEMENT.md) para endpoints, permisos, restricciones y preparación del entorno.
