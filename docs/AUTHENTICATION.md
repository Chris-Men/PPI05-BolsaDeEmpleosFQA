# PB-02 — Inicio de sesión y sesiones revocables

## Estado de las subtareas

| Jira | Resultado |
| --- | --- |
| PB-115 | Login REST conectado a Prisma y bcrypt. |
| PB-116 | Formulario accesible con validación, errores y bloqueo de envíos repetidos. |
| PB-117 | Credenciales verificadas sin revelar existencia o estado de la cuenta. |
| PB-118 | JWT de acceso y renovación con sesiones revocables en PostgreSQL. |
| PB-119 | Restauración entre visitas, navegación por rol y cierre de sesiones. |
| PB-120 | Pruebas unitarias, de integración y verificación en navegador. |

El registro, JWT, permisos y la base visual de login ya existían. Se reutilizan y se amplían.

## Ciclo de sesión

- El registro inicia sesión automáticamente. Login acepta Candidato, Administrador y Super Admin.
- Los correos se normalizan; las contraseñas se comparan literalmente con bcrypt. Login acepta contraseñas históricas sin aplicar el mínimo del registro, con un límite de 72 bytes UTF-8.
- Cada autenticación crea una sesión con vencimiento absoluto a los 30 días. La renovación no extiende ese límite.
- El JWT HS256 dura hasta una hora y contiene `sub`, `sid`, `role`, `iat` y `exp`. El rol del JWT no autoriza acciones.
- Cada petición autenticada verifica sesión, pertenencia, vencimiento, revocación y estado de cuenta. Una cuenta deshabilitada o con deleted_at informado no puede iniciar, renovar ni utilizar sesiones. Los permisos se consultan en PostgreSQL.
- El JWT permanece en memoria. La cookie `fqa_refresh` es HttpOnly, SameSite=Lax, Path=/api/auth, con vencimiento persistente y Secure en producción. No se guardan credenciales en localStorage/sessionStorage.
- La base almacena únicamente hashes SHA-256 de refresh tokens aleatorios de 48 bytes. La renovación consume y reemplaza la credencial en una transacción.
- Reutilizar una credencial consumida revoca la sesión completa, incluidos JWT ya emitidos. Si se pierde la respuesta de una renovación y el navegador conserva la credencial anterior, será necesario iniciar sesión nuevamente.
- Web Locks serializa mutaciones de cookies entre pestañas; BroadcastChannel sincroniza acceso y cierre sin persistir tokens. Se requiere un navegador actualizado en HTTPS o localhost.
- El frontend verifica la cuenta al recuperar el foco y renueva antes del vencimiento. Un fallo de red permite reintentar; un 401 definitivo elimina la sesión.
- Cerrar sesión revoca antes de mostrar éxito. Una revocación externa se detecta en la siguiente petición o comprobación de foco; no se usa WebSocket.
- Los datos de oportunidades y los demás módulos administrativos siguen siendo prototipos locales. El módulo Usuarios se conecta a PostgreSQL en la ampliación documentada en [gestión de usuarios](USER_MANAGEMENT.md).

## API

Todas las rutas usan el prefijo `/api/auth` y respuestas `Cache-Control: no-store`.

Toda mutación requiere `X-FQA-Request: 1`. Si existe `Origin`, debe coincidir exactamente con `CORS_ORIGIN`. El navegador usa `credentials: include`; CORS permite credenciales únicamente desde el origen configurado.

| Método y ruta | Entrada/autorización | Resultado |
| --- | --- | --- |
| POST /register | fullName, email, password | 201, sesión automática y cookie |
| POST /login | email, password | 200, sesión y cookie |
| POST /refresh | Cookie de renovación | 200, nuevo JWT y cookie rotada |
| GET /me | Authorization: Bearer JWT | Identidad pública, roles, permisos y vencimiento |
| POST /logout | Cookie; no necesita JWT vigente | 204, revocación y borrado de cookie; idempotente |
| POST /logout-all | Bearer JWT vigente | 204, revoca todas las sesiones propias |
| POST /users/:userId/revoke-sessions | Bearer, rol SUPER_ADMIN y sessions.revoke.any | 204, revoca todas las sesiones de esa cuenta |

Registro, login y refresh devuelven el mismo contrato:

```json
{
  "userId": 123,
  "user": {
    "id": 123,
    "fullName": "Persona de ejemplo",
    "email": "persona@example.test",
    "role": "CANDIDATE",
    "status": "ACTIVE",
    "createdAt": "2026-09-16T00:00:00.000Z"
  },
  "roles": ["CANDIDATE"],
  "permissions": ["profiles.read.own"],
  "accessToken": "<JWT de acceso>",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "sessionExpiresAt": "2026-10-16T00:00:00.000Z"
}
```

`/me` conserva `userId`, `roles` y `permissions`, y añade `user` y `sessionExpiresAt`. No devuelve tokens.

Ejemplo de revocación con valores ficticios:

```http
POST /api/auth/users/123/revoke-sessions
Authorization: Bearer <JWT vigente de Super Admin>
X-FQA-Request: 1
Origin: https://empleos.example.test
```

Solo Super Admin tiene el nuevo permiso del catálogo; no se añade pantalla de revocación administrativa. Las cuentas pueden iniciar sesión nuevamente después de revocarlas.

Errores: 400 para entrada inválida; 401 genérico para credenciales incorrectas, cuenta inactiva o sin rol admitido; 401 para sesión inválida/vencida/revocada; 403 para origen o permisos; 404 para cuenta objetivo inexistente. Los errores no incluyen credenciales.

## Migración y compatibilidad

La migración aditiva `20260916083535_revocable_sessions` fue generada por Prisma y crea `auth_sessions` y `refresh_credentials`, relacionadas con usuarios existentes. No modifica datos de cuentas.

En el entorno de destino, aplicar la migración y actualizar catálogos antes de habilitar la versión nueva:

```sh
cd backend
npm run prisma:deploy
npm run prisma:seed
```

La imagen de producción compilada también dispone de `npm run prisma:seed:production`. El seed incorpora el permiso `sessions.revoke.any` exclusivamente a Super Admin.

Desplegar backend y frontend compatibles conjuntamente. Los JWT anteriores sin `sid` se rechazan y requieren nuevo login. No se modificó Docker Compose ni se desplegó esta feature.

En desarrollo, conservar el mismo hostname para frontend y API (por ejemplo, localhost en ambos); los puertos pueden diferir. Producción requiere HTTPS y `CORS_ORIGIN` correspondiente al dominio público.

## Validación

En frontend y backend: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

En backend: `npm run test:integration` con `TEST_DATABASE_URL` apuntando a una base PostgreSQL exclusiva cuyo nombre termine en `_test` y sea diferente de desarrollo. El runner aplica migraciones y catálogos solo allí.

Las pruebas cubren los tres roles, registro automático, JWT, cookies/origen, rotación/reutilización, renovación concurrente, vencimientos, revocación individual/global/administrativa, propiedad, permisos actuales, errores de red y ausencia de bucles de renovación.

La verificación visual usa escritorio y móvil, cuentas desechables y base aislada: login, registro, perfil, dashboard, recarga, reapertura con cookie persistente, dos pestañas simultáneas y cierre global. No reutilizar cuentas o bases de producción para estas comprobaciones.
