# Gestión de usuarios

## Alcance y acceso

El panel conserva su navegación interna. Administrador y Super Admin pueden abrir Usuarios. El backend exige rol administrativo y permisos vigentes de PostgreSQL. Administrador puede consultar y crear únicamente candidatos; Super Admin conserva el listado completo y la edición.

- Listado: `users.read` para Super Admin; `candidates.read` para Administrador, limitado a cuentas cuyo único rol es Candidato. Los filtros no permiten ampliar ese alcance.
- Edición: rol Super Admin y `users.update`. Administrador no puede editar cuentas ni cambiar roles.
- Creación: `candidates.create` para candidatos; rol Super Admin y `administrators.create` para administradores. Administrador no puede crear cuentas privilegiadas.
- Los permisos efectivos derivan de roles; no se asignan permisos individuales.
- Para Super Admin, las cuentas Super Admin son visibles y no pueden modificarse desde este módulo, incluso si tienen otros roles.
- No hay eliminación, restauración, cambio de estado ni restablecimiento de contraseñas.

## API

Prefijo `/api/admin/users`. Todas las operaciones necesitan `Authorization: Bearer <JWT vigente>`. Las mutaciones también necesitan `X-FQA-Request: 1`; si se envía `Origin`, debe coincidir con `CORS_ORIGIN`.

| Método | Entrada | Resultado |
| --- | --- | --- |
| GET / | `search`, `role`, `status`, `page`, `pageSize` opcionales | 200: `{ items, total, page, pageSize }` |
| POST / | `fullName, email, password, role` | 201: usuario creado |
| PATCH /:id | Uno o más de `fullName, email, role` | 200: usuario actualizado |

El listado usa página 1 y 20 registros por defecto, máximo 100, con orden ascendente estable por ID. La búsqueda ignora mayúsculas y permite combinar palabras del nombre/correo. Para Super Admin, los filtros de rol aceptan `CANDIDATE`, `ADMINISTRATOR` y `SUPER_ADMIN`; los de estado, `ACTIVE` y `DISABLED`. Las cuentas eliminadas no aparecen.

Cada usuario devuelve únicamente `id, fullName, email, roles, status, createdAt`. No se exponen contraseñas, hashes, refresh tokens ni sesiones.

Ejemplo ficticio de creación:

```json
{
  "fullName": "Persona de ejemplo",
  "email": "persona@example.test",
  "password": "Una clave ficticia 2026",
  "role": "CANDIDATE"
}
```

Crear/editar solo admite los roles `CANDIDATE` y `ADMINISTRATOR`. Se reutilizan las reglas del registro: nombre de 2 a 150 caracteres, correo válido hasta 255 caracteres normalizado a minúsculas, contraseña de 12 caracteres Unicode como mínimo y 72 bytes UTF-8 como máximo. La contraseña se solicita únicamente al crear y se almacena con bcrypt. Crear otra cuenta no cambia la sesión del operador.

PATCH conserva los roles actuales cuando se omite `role`; si se indica, reemplaza los roles por el único rol seleccionado. Cambiar correo o roles revoca todas las sesiones de la cuenta en la misma transacción. Un cambio de nombre no las revoca.

Los campos adicionales, incluyendo contraseña en PATCH, estado, permisos y eliminación, se rechazan. Errores: 400 entrada inválida; 401 sin sesión válida; 403 rol/permiso insuficiente o edición de Super Admin; 404 objetivo inexistente/eliminado; 409 correo reservado o conflicto concurrente. Intentar asignar Super Admin es una entrada inválida (400).

## Persistencia y auditoría

La migración aditiva generada por Prisma `20260916101548_user_soft_delete` añade `users.deleted_at` nullable. Los usuarios existentes conservan null. El catálogo mantiene Activo y Deshabilitado, independientes de deleted_at:

- Deshabilitado impide login, renovación y acceso autenticado.
- deleted_at informado también los impide aunque el estado sea Activo.
- Las cuentas deshabilitadas pueden consultarse y editarse, sin cambiar su estado.
- El correo de una cuenta eliminada continúa reservado por la restricción única.
- Las cuentas nuevas tienen estado Activo, deleted_at null, perfil y un único rol.

Creación y edición escriben en `AuditLogs` el operador, entidad, acción y valores públicos afectados. No registran contraseña, hash ni tokens. La auditoría y las modificaciones se confirman o revierten juntas.

## Preparación del entorno

Primero generar y validar cualquier migración en una base exclusiva de pruebas cuyo nombre termine en `_test`. Configurar `TEST_DATABASE_URL` con esa base, diferente de desarrollo, y ejecutar en backend:

```sh
npm run test:integration
```

Para actualizar el entorno de desarrollo existente, desde la raíz:

```sh
docker compose -f docker-compose.dev.yml exec backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml exec backend npm run prisma:generate
docker compose -f docker-compose.dev.yml exec backend npm run prisma:seed
docker compose -f docker-compose.dev.yml restart backend
```

El seed actualiza catálogos y concede los nuevos permisos exclusivamente a Super Admin; no crea cuentas privilegiadas ni contiene credenciales. La cuenta inicial se provisiona por separado, comprobando previamente que el correo no exista y almacenando su contraseña con bcrypt. No sobrescribir ni elevar una cuenta incompatible.

En esta implementación la migración y el seed se verificaron tanto en la base aislada como en `fqa_empleos`. El frontend y backend local se usan conjuntamente.

## Verificación

En cada proyecto: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. En backend también `npm run test:integration`.

La cobertura incluye acceso por rol y permisos actuales, creación de candidatos por Administrador y rechazo de operaciones sobre cuentas privilegiadas (incluidos roles mixtos), filtros/paginación, creación de ambos roles, duplicados (también correos de eliminados), campos prohibidos, protección de Super Admin, preservación de múltiples roles, revocación al cambiar identidad/roles, rollback transaccional, auditoría sin secretos y cuentas deshabilitadas/eliminadas mediante fixtures aislados.

La revisión de navegador cubre escritorio y móvil: navegación, lista, búsqueda, formulario, creación/edición, errores y cierre de la sesión de diagnóstico.
