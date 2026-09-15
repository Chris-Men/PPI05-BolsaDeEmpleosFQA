# Instalación y operación de FQA Empleos

Esta guía parte de un clon nuevo y distingue el entorno de desarrollo de la configuración de producción. Todos los comandos Docker se ejecutan desde la raíz del repositorio.

## Requisitos

- Git.
- Docker Desktop o Docker Engine con Docker Compose v2.
- Puertos `5173` y `3000` disponibles en desarrollo.
- Node.js 22 y npm 10 o superior solamente si se ejecutarán servicios fuera de Docker.

Comprueba Docker con:

```bash
docker --version
docker compose version
```

## Archivos locales y variables de entorno

### `.env` de la raíz

Docker Compose lee automáticamente `.env` desde la raíz. Créalo después de clonar:

```powershell
Copy-Item .env.example .env
```

En Bash:

```bash
cp .env.example .env
```

Para desarrollo local puede contener:

```dotenv
NODE_ENV=development

VITE_API_URL=http://localhost:3000/api

PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_DE_64_CARACTERES
DATABASE_URL=postgresql://fqa_user:REEMPLAZAR_PASSWORD@postgres:5432/fqa_empleos?schema=public

POSTGRES_DB=fqa_empleos
POSTGRES_USER=fqa_user
POSTGRES_PASSWORD=REEMPLAZAR_PASSWORD

DOMAIN=localhost
GHCR_OWNER=REEMPLAZAR_OWNER
IMAGE_TAG=latest
```

`POSTGRES_PASSWORD` y la contraseña incluida en `DATABASE_URL` deben representar el mismo valor. Si la contraseña contiene caracteres reservados de una URL, la parte incluida en `DATABASE_URL` debe estar codificada como URL.

Genera `JWT_SECRET` con al menos 32 bytes aleatorios. En PowerShell:

```powershell
[Convert]::ToHexString(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
).ToLower()
```

En Bash con OpenSSL:

```bash
openssl rand -hex 32
```

No reutilices el secreto de desarrollo en producción.

### `backend/.env`

Solo es necesario cuando la API se ejecuta directamente desde `backend/`. Créalo desde su plantilla:

```powershell
Copy-Item backend/.env.example backend/.env
```

La diferencia principal es que `DATABASE_URL` usa `localhost`, porque Node se ejecuta fuera de la red de Docker:

```dotenv
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://fqa_user:REEMPLAZAR_PASSWORD@localhost:5432/fqa_empleos?schema=public
JWT_SECRET=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_DE_64_CARACTERES
TEST_DATABASE_URL=postgresql://fqa_user:REEMPLAZAR_PASSWORD@localhost:5432/fqa_empleos_test?schema=public
```

`TEST_DATABASE_URL` es opcional hasta que se ejecuten pruebas de integración.

### `frontend/.env.local`

Solo es necesario al ejecutar Vite directamente desde `frontend/`. Créalo desde su plantilla:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

En Bash:

```bash
cp frontend/.env.example frontend/.env.local
```

Su contenido es:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Vite incorpora variables `VITE_*` al código del navegador. No coloques secretos en este archivo.

## Desarrollo con Docker Compose

### Primera instalación

1. Crea y completa `.env`.
2. Construye las imágenes de desarrollo:

```bash
docker compose -f docker-compose.dev.yml build
```

3. Inicia PostgreSQL y espera su healthcheck:

```bash
docker compose -f docker-compose.dev.yml up -d --wait postgres
```

4. Genera Prisma Client dentro del volumen de dependencias del backend:

```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:generate
```

5. Aplica todas las migraciones existentes:

```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:deploy
```

6. Carga estados, roles y permisos. El seed es idempotente:

```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:seed
```

7. Inicia frontend y backend:

```bash
docker compose -f docker-compose.dev.yml up -d
```

8. Comprueba los servicios:

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs --tail 100 frontend backend
```

La aplicación queda en `http://localhost:5173` y la salud de la API en `http://localhost:3000/api/health`.

### Arranques posteriores sin cambios de dependencias

```bash
docker compose -f docker-compose.dev.yml up -d
```

Para seguir los logs:

```bash
docker compose -f docker-compose.dev.yml logs -f frontend backend
```

Para detener los contenedores conservando la base y los volúmenes:

```bash
docker compose -f docker-compose.dev.yml stop
```

También puedes eliminarlos conservando los volúmenes:

```bash
docker compose -f docker-compose.dev.yml down
```

No añadas `--volumes` o `-v` salvo que quieras borrar también la base local y reinstalar desde cero.

### Después de actualizar el repositorio

Si un `git pull` cambia `package.json`, `package-lock.json`, Dockerfiles o el esquema Prisma, detén los procesos antes de reemplazar `node_modules`:

```bash
docker compose -f docker-compose.dev.yml stop frontend backend
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml run --rm --no-deps frontend npm ci
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm ci
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:generate
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml run --rm --no-deps backend npm run prisma:seed
docker compose -f docker-compose.dev.yml up -d
```

No uses `prisma migrate reset` sobre una base con datos que deban conservarse.

### Error `504 Outdated Optimize Dep`

Ocurre cuando las dependencias cambian mientras Vite sigue activo. Reconstruye el volumen con Vite detenido:

```bash
docker compose -f docker-compose.dev.yml stop frontend
docker compose -f docker-compose.dev.yml run --rm --no-deps frontend npm ci
docker compose -f docker-compose.dev.yml up -d frontend
```

Después realiza una recarga forzada del navegador con `Ctrl + Shift + R`.

## Desarrollo sin Docker para Node y Vite

PostgreSQL puede seguir ejecutándose con Docker:

```bash
docker compose -f docker-compose.dev.yml up -d --wait postgres
```

Crea `backend/.env` y ejecuta:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

En otra terminal, crea `frontend/.env.local` y ejecuta:

```bash
cd frontend
npm ci
npm run dev
```

## Pruebas de integración del backend

Crea una base exclusiva cuyo nombre termine en `_test`:

```bash
docker compose -f docker-compose.dev.yml exec postgres createdb -U fqa_user fqa_empleos_test
```

Ajusta el usuario y el nombre si modificaste `.env`. Configura `TEST_DATABASE_URL` en `backend/.env` y ejecuta:

```bash
cd backend
npm run test:integration
```

El ejecutor rechaza una URL que no termine en `_test` o que coincida con `DATABASE_URL`.

## Producción

La producción usa `docker-compose.yml`, imágenes publicadas en GHCR y Caddy para TLS. El servidor necesita:

- DNS del dominio apuntando al servidor.
- Puertos `80` y `443` abiertos.
- Docker Compose v2.
- Una copia del repositorio, normalmente en `/opt/fqa-empleos`.
- Acceso de lectura a GHCR si las imágenes son privadas.
- Un `.env` exclusivo del servidor.

Ejemplo de `.env` de producción:

```dotenv
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://empleos.example.com
JWT_SECRET=REEMPLAZAR_POR_UN_SECRETO_DISTINTO_Y_ALEATORIO
DATABASE_URL=postgresql://fqa_prod:REEMPLAZAR_PASSWORD@postgres:5432/fqa_empleos?schema=public
POSTGRES_DB=fqa_empleos
POSTGRES_USER=fqa_prod
POSTGRES_PASSWORD=REEMPLAZAR_PASSWORD
DOMAIN=empleos.example.com
GHCR_OWNER=organizacion-o-usuario-de-github
IMAGE_TAG=sha-o-etiqueta-publicada
```

### Funcionamiento de la configuración de producción

Caddy recibe el tráfico público y aplica TLS automáticamente para `DOMAIN`. Las solicitudes `/api/*` se envían al backend y el resto se envía al contenedor frontend. El frontend usa `/api` como ruta predeterminada en su build de producción, por lo que todas las llamadas permanecen en el mismo dominio.

La imagen final del backend contiene un ejecutor compilado para el seed. Esto permite preparar los estados, roles y permisos sin incluir `tsx` ni el código TypeScript fuente en la imagen de producción.

### Primera instalación en producción

```bash
cd /opt/fqa-empleos
docker login ghcr.io
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d --wait postgres
docker compose -f docker-compose.yml run --rm backend npx prisma migrate deploy
docker compose -f docker-compose.yml run --rm backend npm run prisma:seed:production
docker compose -f docker-compose.yml up -d --remove-orphans
docker compose -f docker-compose.yml ps
```

La comprobación final debe abrir `https://DOMINIO/` y `https://DOMINIO/api/health`.

### Despliegues posteriores

El workflow `.github/workflows/deploy-production.yml` se ejecuta al publicar en `main`: construye las imágenes, las publica con el SHA del commit, entra al servidor por SSH, actualiza el checkout con avance rápido, descarga las imágenes, aplica migraciones, sincroniza catálogos y levanta los servicios.

El workflow ejecuta el seed productivo después de las migraciones; es seguro repetirlo porque sincroniza los catálogos de forma idempotente. Para un despliegue manual:

```bash
cd /opt/fqa-empleos
git pull --ff-only
export IMAGE_TAG=SHA_PUBLICADO
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml run --rm backend npx prisma migrate deploy
docker compose -f docker-compose.yml run --rm backend npm run prisma:seed:production
docker compose -f docker-compose.yml up -d --remove-orphans
docker image prune -f
```

En PowerShell, establece la etiqueta con `$env:IMAGE_TAG = 'SHA_PUBLICADO'` en lugar de `export`.

## Diagnóstico

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs --tail 200 frontend backend postgres
docker compose -f docker-compose.dev.yml config
```

`docker compose config` permite comprobar que todas las variables requeridas fueron sustituidas, pero puede mostrar valores sensibles. No compartas su salida sin revisarla.