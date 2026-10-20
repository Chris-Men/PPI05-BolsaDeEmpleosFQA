# Respaldos y restauración

El módulo está habilitado únicamente en desarrollo y admite un backend coordinador por volumen. Producción permanece deshabilitada: su proveedor privado y su operación se implementarán por separado.

## Configuración local

La imagen de desarrollo incluye `postgresql17-client`, necesario para utilizar las herramientas oficiales de PostgreSQL 17. No se añaden dependencias npm. El backend utiliza estos valores:

| Variable | Valor en Compose de desarrollo |
|---|---|
| `BACKUPS_ENABLED` | `true` |
| `BACKUP_DIRECTORY` | `/app/private/backups` |
| `BACKUP_ENCRYPTION_KEY` | Secreto independiente de 32 bytes, expresado como 64 caracteres hexadecimales |
| `RESUME_STORAGE_DIRECTORY` | `/app/private/resumes` |

`scripts/setup-dev.ps1` genera la clave cuando no existe y conserva una ya configurada. La clave debe mantenerse fuera de Git y conservarse para poder leer el respaldo; no se deriva de JWT ni de la clave de correo. Para ejecución sin Docker también deben estar instalados los clientes PostgreSQL 17.

Compose monta el volumen `backup_data` exclusivamente en el backend, separado de `postgres_data` y `resume_data`. Los tres persisten al recrear el backend. El respaldo no incluye `.env`, secretos de infraestructura ni roles globales del servidor PostgreSQL. El volumen es local al servidor; esta entrega no incorpora almacenamiento externo.

## Programación y conservación

Se respalda toda la DB de la aplicación, incluyendo datos, esquema, secuencias e historial de Prisma, junto con los CV privados. La hora diaria es 02:00 de `America/El_Salvador`, independientemente de la zona horaria del contenedor.

Al habilitar el módulo se crea un primer respaldo. Si el backend estuvo detenido, al arrancar recupera el último horario pendiente, sin crear un archivo por cada día perdido. Un fallo tiene tres reintentos separados por cinco minutos; agotados estos, se permite la generación manual y se conserva el siguiente horario diario. Crear un respaldo manual no cancela el próximo automático.

Se conserva una generación completa. La generación nueva se prepara, cifra con AES-256-GCM y verifica íntegramente antes de publicar su referencia. El manifiesto autenticado incluye hashes SHA-256, versión de PostgreSQL, huella de migraciones y metadatos. Solo después de publicar se elimina la anterior. Si falla la generación, el respaldo anterior se conserva.

Durante el respaldo se bloquean las escrituras HTTP, se espera el trabajo iniciado y se pausan correo y limpieza de CV. Las consultas con una sesión válida siguen disponibles. Las solicitudes bloqueadas reciben `503`, mensaje en español y `Retry-After`.

## Contratos y permisos

| Método y ruta | Acceso y contrato |
|---|---|
| `GET /api/admin/backups` | Super Admin y `database.backup`; disponibilidad, última generación, próxima ejecución y operación reciente |
| `POST /api/admin/backups` | Super Admin y `database.backup`; `{ requestId: UUID }` |
| `POST /api/admin/backups/restore` | Super Admin y `database.restore`; `{ requestId, backupId, currentPassword, confirmation: "RESTAURAR" }` |
| `GET /api/admin/backups/export?backupId=UUID` | Super Admin y `database.backup`; descarga privada `.fqabackup`, sin caché |
| `POST /api/admin/backups/import` | Super Admin, `database.backup` y `database.restore`; multipart con `file`, `requestId`, `backupId` (vacío si no existe) y `confirmation: "IMPORTAR"` |
| `GET /api/admin/backups/operations/:id` | Credencial de seguimiento en `X-FQA-Operation-Token` |

Las mutaciones requieren además el control de origen existente. Los permisos se consultan desde la DB en cada solicitud; asignar accidentalmente los permisos a Administrador no permite ejecutar estas acciones. No se requieren permisos nuevos, seeds adicionales ni migraciones.

Las operaciones aceptadas responden `202` con `{ operation, monitorToken }`. El `requestId` permite repetir una solicitud aceptada sin ejecutar otra operación. Se conservan como máximo cien registros de operación en el diario; los reintentos requieren que dicho registro siga disponible. La admisión es exclusiva: otra operación simultánea recibe `409` o `503` durante mantenimiento.

La credencial de seguimiento solo permite consultar una operación, durante un máximo de 24 horas desde su inicio y treinta minutos después de terminar. No autoriza descargas, lecturas de datos ni nuevas operaciones. Se envía en un header, nunca en la URL. El frontend la conserva en `sessionStorage` para continuar tras recargar y la elimina al terminar, cerrar sesión o cambiar de identidad.

## Exportar e importar

El apartado **Exportar e importar**, dentro de Respaldos, permite descargar el respaldo disponible y cargar uno exportado anteriormente. Exportar prepara una copia independiente: no crea otro respaldo ni altera el horario automático. El archivo incluye el dump PostgreSQL y los CV cifrados, junto con el manifiesto autenticado. No incluye el catálogo, diario de operaciones, contraseñas de infraestructura ni la clave de cifrado.

**Conservar por separado `BACKUP_ENCRYPTION_KEY` del servidor de origen es indispensable.** El servidor de destino debe tener esa misma clave configurada; no se permite enviar claves en el formulario. Si difiere, el archivo no podrá importarse. Cambiar la clave de una instalación que ya tiene respaldos requiere un procedimiento operativo; no debe hacerse para probar una importación. Producción conserva la condición de módulo deshabilitado.

El formato versionado `.fqabackup` es propio y no es un ZIP ni un SQL: cabecera `FQA-BACKUP` y byte de versión 1, longitud de manifiesto de cuatro bytes big-endian, manifiesto JSON autenticado y artefactos cifrados concatenados (DB primero y después los CV en el orden del manifiesto). Las longitudes proceden del manifiesto firmado. La importación limita el archivo a **1 GiB**, el manifiesto a 16 MiB, exige un único campo de archivo y no descomprime ni extrae rutas del usuario. El contenido se procesa mediante streams y archivos privados temporales, sin cargar el respaldo completo en memoria del backend. El navegador prepara la descarga como Blob.

Importar exige escribir `IMPORTAR`. Primero se valida la firma del formato, HMAC, longitudes exactas, clave, etiquetas AES-GCM, hashes, documentos, PostgreSQL 17, presencia de Super Admin y coincidencia de migraciones. `pg_restore` solo convierte el dump a una salida descartada durante la validación; **no lo aplica a la DB**. Una nueva generación con identificador aleatorio se publica después de todas las comprobaciones y sustituye la anterior. Si algo falla, se conserva el respaldo anterior. La fecha mostrada sigue siendo la fecha de creación original del respaldo.

La importación responde `202` con operación de tipo `IMPORT` y utiliza el seguimiento existente. Durante la validación se bloquean escrituras y se pausan trabajadores; las consultas permanecen disponibles. Reintentar el mismo `requestId` devuelve la operación original. Una pantalla cuyo `backupId` ya no coincide recibe `409`; se debe actualizar y confirmar de nuevo. Archivos y staging se eliminan al finalizar, cancelar o recuperar un proceso interrumpido.

**Importar y restaurar son acciones separadas.** Tras importar, Super Admin debe utilizar «Restaurar último respaldo» y confirmar su contraseña y `RESTAURAR` para modificar los datos. La importación por sí sola no invalida sesiones. Se registran auditorías de exportación y validación de importación. Los permisos se comprueban antes de procesar la subida y nuevamente antes de validar el contenido; el transporte mantiene la identidad de la cuenta durante renovaciones de sesión.

## Restauración

Super Admin confirma la fecha del respaldo, su contraseña actual y el texto `RESTAURAR`. Si cambió el respaldo mostrado, se devuelve `409`. Las cuentas y contraseñas también vuelven a la fecha respaldada.

La restauración verifica el manifiesto, todos los archivos y la compatibilidad exacta del historial de migraciones. No restaura automáticamente un esquema anterior bajo código nuevo ni ejecuta migraciones como parte de la operación. El respaldo debe contener al menos un Super Admin activo con permiso de restauración.

Se activa mantenimiento total y se espera a las solicitudes y trabajadores iniciados. Los CV faltantes se preparan y sincronizan a disco sin eliminar los actuales. Si una misma clave inmutable ya existe con contenido diferente, la operación se detiene antes de modificar la DB.

Se genera SQL mediante `pg_restore` y se ejecuta con `psql --single-transaction --set ON_ERROR_STOP=on`. La restauración, revocación de sesiones, invalidación de enlaces de recuperación, descarte de correos pendientes recuperados y auditoría se guardan en la misma transacción. No se reenvían mensajes recuperados de una cola anterior. Un error revierte la transacción completa. Los documentos posteriores sin referencias quedan para la limpieza existente; los documentos respaldados conservan sus referencias históricas.

La auditoría incluye un identificador único de operación. El catálogo, diario y marcador de mantenimiento permanecen fuera de la DB. Tras una interrupción, el coordinador consulta la marca transaccional con un bloqueo asesor: si confirmó el commit, termina la recuperación; si hubo rollback, declara fallo; si no puede determinarlo, mantiene el mantenimiento y reintenta la comprobación. El apagado normal cancela herramientas nativas antes de liberar el coordinador.

Al finalizar correctamente se reanudan los servicios y todas las personas deben iniciar sesión. La interfaz confirma éxito únicamente con el resultado del servidor. Si PostgreSQL está totalmente inaccesible y no se puede autenticar, la restauración mediante la interfaz no está disponible: la recuperación requiere intervención operativa con el almacenamiento y las herramientas nativas.

No deben editarse ni eliminarse manualmente el diario o `restore-pending.json` para forzar la reapertura. Ante un estado incierto, comprobar primero PostgreSQL y la marca de auditoría correspondiente. Una clave incorrecta, un manifiesto corrupto o una instancia coordinadora activa impiden habilitar el módulo; el resto de la API continúa operativo salvo que haya una restauración pendiente que deba resolverse.

## Validación

`npm run typecheck`, `npm run lint`, `npm test` y `npm run build` se ejecutan en ambos proyectos. `npm run test:integration` exige una URL explícita `TEST_DATABASE_URL`, distinta de desarrollo y terminada en `_test`; crea directorios temporales independientes para CV y respaldos y genera secretos de prueba.

Las pruebas usan herramientas PostgreSQL reales y cubren restauración de CV históricos, borradores, seguridad, reemplazo, corrupción, permisos, idempotencia, fallos dentro de la transacción, pérdida de confirmación del commit, reintentos y recuperación. La revisión visual utiliza `tests/helpers/backup-browser.ts` y `frontend/tests/browser/backups.mjs`, con una DB `_test`, Mailpit y una instancia de Edge con depuración local. Los endpoints `__test` solo existen en ese helper protegido; no forman parte de la API de la aplicación.
