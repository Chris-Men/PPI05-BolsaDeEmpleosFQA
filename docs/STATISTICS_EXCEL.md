# Exportación administrativa XLSX

La vista Estadísticas permite **Exportar Excel** además del reporte PDF. El libro contiene datos detallados para análisis externos, sin aplicar el Top 5 de las gráficas ni las páginas de las tablas. Cada solicitud exige confirmar explícitamente el período aplicado. Editar fechas sin aplicarlas deshabilita el botón.

## Hojas y poblaciones

| Hoja | Población y contenido |
| --- | --- |
| Usuarios | Todos los candidatos activos, no eliminados y cuyo único rol es Candidato, aunque nunca hayan postulado. ID, perfil actual, correo, teléfono, nacimiento, edad al extraer, sexo original, ubicación, educación, profesión, resumen, registro y disponibilidad de CV. No incluye trayectorias, archivos o credenciales. |
| Oportunidades | Empleo, voluntariado, horas sociales y prácticas con primera publicación dentro del período. Incluye cerradas y archivadas. Clave, título, tipo, organización, categoría actual, modalidad, ubicación, cupos, salario, horas/duración, correo y teléfono de contacto separados, contacto anterior y fechas/estado actual. |
| Postulaciones | Todos los intentos recibidos en el período, incluso retirados, de candidatos fuera del padrón activo y sobre vacantes anteriores. Una fila por intento, con referencia, ID de candidato, pertenencia al padrón, oportunidad, tipo, organización, categoría actual, envío, estado actual y disponibilidad de CV. Nunca incluye datos personales ni snapshots de candidatos fuera del padrón. |
| Organizaciones | Todas las organizaciones, activas e inactivas, tengan o no actividad reciente. ID, nombre, correo, descripción, estado, registro y contadores. |
| Diccionario | Versión del formato, rango, zona horaria, fecha de extracción UTC, fecha de referencia salvadoreña, poblaciones, cantidades exportadas y definiciones de columnas. |

Las relaciones usan IDs estables y claves `job-ID` / `volunteer-ID`, evitando colisiones entre tablas. Una postulación puede referirse a una oportunidad anterior que no aparezca en Oportunidades; por eso incluye su título, tipo y organización. Una fila de Postulaciones cuyo candidato esté fuera del padrón activo mantiene su ID, pero no necesita una fila correspondiente en Usuarios.

El formato actual es **2** y se registra en Diccionario. Las nuevas columnas de contacto exportan los valores almacenados, con teléfonos como texto de ocho dígitos locales. Contacto anterior conserva el texto original; los datos históricos no se reinterpretan ni se sobrescriben en el XLSX.

Usuarios, Oportunidades y Organizaciones incluyen contadores separados del período y acumulados: intentos totales y por cada uno de los cuatro tipos, oportunidades distintas, voluntariados distintos y seleccionadas según el **estado actual**. Oportunidades y Organizaciones incluyen candidatos distintos. Organizaciones añade publicaciones totales y por tipo. Intentos repetidos se cuentan individualmente; entidades distintas se cuentan una sola vez. Inscripciones sin postulación enviada y borradores no cuentan.

Los períodos incluyen días completos de `America/El_Salvador` (UTC−06), con límite superior exclusivo al inicio del día posterior a Hasta. Los acumulados incluyen todos los registros conservados al extraer, incluidos intentos sin fecha; las publicaciones acumuladas requieren `publishedAt`. Todas las hojas se leen desde un mismo snapshot `REPEATABLE READ` al comenzar la generación, no al confirmar el trabajo. Los contadores de Usuarios se limitan al padrón activo; los de Organizaciones y los intentos exportados conservan toda la actividad.

Los campos faltantes quedan vacíos y los valores históricos no se convierten. Sexo `UNDISCLOSED` se distingue de una celda vacía. Fechas de nacimiento se escriben como fechas calendario; otros timestamps se expresan en hora salvadoreña y el diccionario lo indica. Números y booleanos conservan sus tipos; teléfonos conservan ceros iniciales. Textos se escriben literalmente, nunca como fórmulas. No se exportan contraseñas, tokens, sesiones, borradores ni JSON internos. Las hojas que alcancen el límite de Excel continúan en partes numeradas con encabezados idénticos. Un texto histórico superior a 32.767 caracteres produce un error explícito, sin truncamiento silencioso.

## Contratos y acceso

Se exigen un rol Administrador o Super Admin y ambos permisos `statistics.read` y `statistics.export`. El seed asigna el nuevo permiso a ambos roles. La autorización se consulta al solicitar, al generar, antes de publicar y al descargar. Solo el propietario puede consultar o descargar sus trabajos, incluido Super Admin.

| Endpoint | Contrato |
| --- | --- |
| `POST /api/admin/statistics/exports` | `{ from: YYYY-MM-DD, to: YYYY-MM-DD, requestId: UUID, confirmed: true }`. Exige las protecciones existentes de mutaciones y devuelve `202` con el trabajo, sin generar el archivo dentro de la petición. |
| `GET /api/admin/statistics/exports?page=1&pageSize=10` | Lista propia de los últimos 30 días: `{ items, total, page, pageSize }`. Tamaño máximo 100. |
| `GET /api/admin/statistics/exports/:id` | Estado y metadatos del trabajo propio. Un ID inexistente o ajeno devuelve `404`. |
| `GET /api/admin/statistics/exports/:id/file` | Binario autenticado `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; `409` si no está listo, `410` si venció o falta el archivo. |

El DTO de un trabajo contiene `id`, `from`, `to`, `status`, `createdAt`, `startedAt`, `completedAt`, `snapshotAt`, `expiresAt`, `sizeBytes`, `rowCounts`, `error` y `fileName`. No incluye paths privados, leases o IDs de otros solicitantes. Las respuestas son `no-store`. El nombre descargado es `datos_FQA_YYYY-MM-DD_YYYY-MM-DD_ID.xlsx`.

`requestId` permite repetir una petición de resultado incierto sin duplicar el trabajo. Reutilizarlo con otro rango devuelve `409`. Mientras el usuario tenga un trabajo en cola o procesándose, el mismo rango reutiliza ese trabajo y otro rango devuelve `409`. Una nueva generación posterior exige otra confirmación y UUID; reintentar la descarga conserva el archivo existente.

## Cola y operación

La cola está en `StatisticsExport`, con relación explícita a User. Estados: `QUEUED`, `PROCESSING`, `READY`, `FAILED`, `EXPIRED`. El trabajador se inicia únicamente desde el entrypoint del backend y consulta cada dos segundos. Reclama un trabajo FIFO global mediante transacción serializable. Renueva un lease de 60 segundos cada 15 segundos; recupera leases vencidos y permite hasta tres intentos ante fallos transitorios, con espera de 15/30 segundos antes de los siguientes intentos. El snapshot de extracción tiene un máximo de cinco minutos por intento.

La escritura es incremental con ExcelJS; los lotes y páginas agregadas son de 500 registros. El archivo temporal privado se publica solo tras completar el libro, revalidar autorización y conservar el lease. La actualización a Listo y su auditoría son atómicas. La publicación incierta tras una interrupción de conexión se verifica antes de retirar el archivo.

Cada archivo vence 24 horas después de quedar listo. La descarga verifica el plazo independientemente de la limpieza, que corre cada minuto y elimina vencidos y temporales huérfanos. Los registros terminales se retiran después de 30 días. La auditoría registra solicitud, resultado, reintentos y descarga mediante IDs/metadatos, sin contenidos personales.

El seguimiento pertenece a la sesión administrativa, continúa al navegar y se recupera al recargar. La aplicación consulta cada tres segundos y descarga automáticamente los archivos listos. Los marcadores locales guardan únicamente IDs y vencimientos por cuenta/trabajo para evitar descargas automáticas repetidas en ese navegador. Si no hay almacenamiento local, funciona la protección en memoria durante la sesión. **Descargar** siempre permite reintentar; el navegador decide dónde guardar y puede bloquear descargas automáticas. Cerrar el navegador no detiene la generación: el trabajo se recupera al volver. Cambiar de cuenta o cerrar sesión aborta las solicitudes del navegador y descarta su estado visible.

El trabajador utiliza la puerta de pausa/drenaje de respaldos existente. Una restauración invalida todas las exportaciones dentro de la misma transacción PostgreSQL y sus archivos se eliminan como huérfanos. Los XLSX son datos derivados temporales y no se incorporan al respaldo de CV; el hash de migraciones continúa exigiendo compatibilidad exacta del esquema.

## Configuración y despliegue

`STATISTICS_EXPORT_DIRECTORY` señala un directorio privado, nunca un directorio estático. Los Compose de desarrollo y producción montan exclusivamente en backend el volumen `statistics_export_data` en `/app/private/statistics-exports`. El frontend sigue accediendo mediante REST y PostgreSQL conserva su volumen y configuración. Sin directorio configurado no se admite la creación de trabajos y el trabajador permanece inactivo.

Antes de iniciar el backend actualizado, instalar dependencias con el lockfile, aplicar migraciones, generar Prisma y ejecutar el seed de permisos. Para desarrollo:

```bash
docker compose -f docker-compose.dev.yml exec -T backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml exec -T backend npm run prisma:generate
docker compose -f docker-compose.dev.yml exec -T backend npm run prisma:seed
docker compose -f docker-compose.dev.yml up -d --no-deps backend
```

La migración es aditiva y conserva los datos existentes. ExcelJS es la dependencia adicional para crear XLSX con varias hojas y escritura incremental; el lockfile fija versiones y overrides compatibles para sus dependencias uuid y brace-expansion. No se añade Redis ni otro contenedor de ejecución.

## Verificación

Las pruebas unitarias comprueban contratos, permisos, edades, texto literal, tipos y continuación de hojas con un límite reducido. La integración lee XLSX reales y comprueba poblaciones, relaciones, intentos repetidos, cuatro tipos, límites de día, valores históricos, privacidad, más de un lote, resultados vacíos, idempotencia, concurrencia, recuperación de leases, pausa de respaldos, fallos de disco y vencimiento. El ejecutor configura un directorio temporal exclusivo de exportaciones, además de exigir una base `_test` distinta de desarrollo.

Con el helper protegido `backend/tests/helpers/statistics-browser.ts`, API en `3100`, frontend en `5173` y Edge temporal en `9342`, ejecutar `node frontend/tests/browser/statistics-excel.mjs`. Comprueba confirmación por teclado, cancelación, persistencia tras recarga, navegación, descarga real, marcadores, errores recuperables, regeneración de vencidos, cambio de cuenta y anchos de 390/320 píxeles. Los controles del trabajador y vencimiento existen solo en ese helper de pruebas.
