# Estadísticas administrativas y configuración del sitio

Los módulos consultan la API y PostgreSQL. No calculan totales a partir de páginas de vacantes ni guardan configuración en `localStorage`. Esta funcionalidad no modifica el esquema ni requiere migraciones.

## Acceso

| Operación | Permiso | Roles admitidos |
| --- | --- | --- |
| Dashboard y estadísticas | `statistics.read` | Administrador, Super Admin |
| Consultar configuración administrativa | `site-settings.read` | Administrador, Super Admin |
| Guardar o restaurar configuración | `site-settings.update` | Solo Super Admin |

El backend vuelve a consultar los permisos vigentes en cada solicitud. El rol de Super Admin es obligatorio para escribir, incluso si el permiso se asignara por error a un Administrador. Los servicios HTTP administrativos utilizan la precondición de identidad existente: una petición o renovación de sesión no puede completar una operación como otra cuenta.

## Contratos de estadísticas

`GET /api/admin/statistics/dashboard` no admite filtros. Devuelve:

- `opportunities`: todas las vacantes registradas en `Jobs` y `VolunteerOpportunities`, incluidas borradores, cerradas y archivadas.
- `organizations`: todas las organizaciones, activas e inactivas.
- `applications`: todos los intentos enviados conservados.
- `withResume`: intentos que tienen CV, mediante `resumeId` o documentos históricos de tipo `RESUME`; cada intento cuenta una sola vez.
- `applicants`: candidatos distintos entre todos los intentos.
- `recentOpportunities`: las diez vacantes más recientes de ambas tablas, con clave, título, organización, tipo, estado, fecha y candidatos distintos. Los intentos repetidos del mismo candidato no incrementan ese último contador. Las fechas nulas se ordenan al final y los empates son estables.

`GET /api/admin/statistics?from=YYYY-MM-DD&to=YYYY-MM-DD` exige ambas fechas reales y un rango ordenado. Interpreta cada día completo en `America/El_Salvador` (UTC−06:00): `from` es inclusivo a las 00:00 y el límite superior es exclusivo a las 00:00 del día posterior a `to`.

| Campo | Criterio |
| --- | --- |
| `publishedOpportunities` | Primera publicación (`publishedAt`) dentro del rango, aunque después se cierre o archive. |
| `byKind` | La misma población, separada en `EMPLOYMENT`, `VOLUNTEER`, `SOCIAL_HOURS`, `INTERNSHIP`. |
| `byCategory` | Filas `{ categoryId: number \| null, name, publishedOpportunities, applications }` con actividad. Cada cantidad usa su propia fecha; la categoría es la asignada actualmente a la vacante. Incluye categorías inactivas, vacantes cerradas/archivadas e intentos retirados. No acumula hijos en padres. `null` se presenta como **Sin categoría**. Orden: postulaciones descendente, publicaciones descendente, nombre en español y ID como desempate. |
| `demographics` | `{ totalCandidates, asOfDate: YYYY-MM-DD, timeZone, byAge, bySex, byEducationLevel, byDepartment }`. Padrón acumulado e independiente del rango, idéntico a `users.total`. Cada distribución contiene filas `{ key, label, count }`; no expone identidades ni valores individuales. |
| `organizations` | Total acumulado, independiente del rango. |
| `applications` | Intentos enviados (`createdAt`) dentro del rango, incluidas retiradas e intentos históricos. |
| `applicants` | Candidatos distintos de esos intentos. |
| `states` | Estado actual de esos intentos; un estado histórico desconocido aparece como `UNKNOWN`. |
| `selectionRate` | Seleccionadas / intentos del rango × 100. |
| `applicationsPerOpportunity` | Intentos del rango / vacantes distintas que recibieron esos intentos. |
| `activeOpportunities` | Disponibilidad pública actual: publicada, vigente, sin archivar y con organización y categoría activas. No representa la disponibilidad histórica del rango. |
| `opportunitiesWithApplications` | Vacantes distintas de los cuatro tipos que recibieron postulaciones en el rango. |
| `pendingApplications` | Intentos recibidos en el rango cuyo estado actual es Pendiente o En revisión. |
| `users.total` | Únicamente candidatos activos y no eliminados, sin roles administrativos adicionales. Excluye administradores, Super Admin y candidatos deshabilitados. Acumulado independiente del rango. |
| `users.candidates` | Usuarios registrados que tienen el rol Candidato, excluyendo cuentas eliminadas. Acumulado independiente del rango. |
| `users.selected` | Candidatos activos y no eliminados, sin roles administrativos adicionales, seleccionados al menos una vez en cualquier vacante. Se consulta tanto el estado actual como el historial de selección de sus intentos, sin filtrar fechas ni duplicar personas. Utiliza la misma población que `users.total`. |
| `users.selectionRate` | `users.selected / users.total × 100`; cero cuando no hay candidatos activos registrados. El porcentaje utiliza exclusivamente esa población y se identifica expresamente en la interfaz. |
| `users.newCandidates` | Candidatos registrados dentro del rango, con días completos salvadoreños y sin cuentas eliminadas. |
| `users.withResume` | Candidatos registrados con un CV activo vinculado a su perfil actualmente. No cuenta CV que solo pertenecen a postulaciones históricas. |
| `range` | Fechas aplicadas, zona horaria y `firstActivityDate`, el primer día con publicaciones, postulaciones o registros de candidatos con fecha guardada. Se consulta toda la DB, independientemente del rango. Si no hay actividad pasada se utiliza hoy. |

Los cocientes sin denominador devuelven cero. Los registros históricos sin fecha de publicación o envío no se asignan a una fecha inventada; siguen incluidos en los totales acumulados que les correspondan. Cada respuesta se obtiene mediante agregados Prisma dentro de una transacción con snapshot consistente.

La demografía consulta los perfiles actuales de candidatos activos, no eliminados y cuyo único rol es Candidato, aunque nunca hayan postulado. Las fechas se agrupan en PostgreSQL y las edades cumplidas se calculan sobre una única fecha de referencia actual en `America/El_Salvador`. Los grupos son `AGE_16_24`, `AGE_25_34`, `AGE_35_44`, `AGE_45_PLUS`; `UNDER_16` solo aparece si existen menores históricos. Fechas ausentes, imposibles o futuras van a `UNKNOWN` (**Sin datos**). El sexo distingue `FEMALE`, `MALE`, `UNDISCLOSED` (**Prefiero no indicar**) y `UNKNOWN`.

Educación y departamento reutilizan los catálogos del perfil. Valores históricos no vacíos que no coinciden exactamente con el catálogo van a `OTHER` (**Otros valores anteriores**), sin convertirlos. Los perfiles ausentes y campos vacíos van a **Sin datos**. Cada candidato cuenta una vez por distribución; todas suman `totalCandidates`, que también es el denominador de los porcentajes, incluidos los datos faltantes. No se cargan identidades ni se realizan consultas por candidato o categoría.

En la vista y el PDF, educación y departamento ocultan **Otros valores anteriores** y muestran únicamente el **Top 5**, ordenado por cantidad descendente y por nombre en español en caso de empate. **Sin datos** puede aparecer si queda entre los cinco primeros. Los agregados completos de la API se conservan y los porcentajes siguen usando el padrón total; las cinco filas visibles pueden sumar menos del 100 %.

La interfaz abre los últimos treinta días, incluyendo hoy en El Salvador. Los períodos rápidos de treinta días, noventa días, este año y **Desde el inicio** aplican inmediatamente y sincronizan Desde/Hasta. **Desde el inicio** consulta desde el primer día de actividad guardada hasta hoy, ambos en horario salvadoreño; si al actualizar se encuentra actividad más antigua, amplía automáticamente el rango. La edición manual requiere **Aplicar** y cambia el selector a Personalizado. Un rango inválido conserva el último rango aplicado. Una solicitud fallida muestra error, reintento y valores desconocidos (`—`), sin presentar el fallo como un resultado vacío.

El resumen operativo diferencia mediante sus etiquetas los datos acumulados, los del período y los actuales. **Usuarios registrados** y **Usuarios con alguna selección** utilizan únicamente candidatos activos y no eliminados; el segundo representa personas únicas seleccionadas sobre esa misma población. **Candidatos registrados** conserva el total de candidatos activos y deshabilitados, sin eliminados. **Tasa de selección del período** representa postulaciones seleccionadas sobre intentos recibidos en las fechas consultadas. Una misma persona puede tener varias postulaciones seleccionadas y solo cuenta una vez en el indicador de usuarios.

Después de las gráficas del período se muestran **Oferta y demanda por categoría**, con paginación local de diez filas y totales de todas las categorías, **Resumen operativo** y **Perfil del padrón de candidatos**, con cuatro gráficas horizontales, cantidades, porcentajes y fecha de referencia. Las tarjetas del padrón se alinean por fila en dos columnas y pasan a una columna en móvil. El encabezado del resumen muestra el período aplicado como texto; editar fechas sin aplicarlas no lo cambia. Las tarjetas **Postulaciones por revisar** y **Oportunidades activas actualmente** se retiraron de la vista y del PDF; sus campos API se conservan por compatibilidad.

## Reporte operativo en PDF

La exportación detallada a Excel tiene confirmación, cola persistente y cinco hojas; sus contratos y criterios se documentan en [Exportación administrativa XLSX](STATISTICS_EXCEL.md).

**Exportar PDF**, en Estadísticas, descarga un reporte A4 para el período aplicado, incluido **Desde el inicio**, con tantas páginas como necesiten los datos:

1. Resumen ejecutivo con las tarjetas principales, candidatos activos registrados, personas seleccionadas, su porcentaje y candidatos con CV activo.
2. Gráficas de barras de oportunidades publicadas por tipo y de estados de postulaciones, con cantidades, porcentajes y leyendas en español. Los períodos sin registros se identifican expresamente.
3. Tabla completa de oferta y demanda por categoría, sin aplicar la paginación visual de diez filas; repite encabezados y ajusta nombres largos automáticamente.
4. Las cuatro distribuciones demográficas acumuladas, con la misma fecha, cantidades, denominador y porcentajes de la vista; educación y departamento muestran el Top 5. Las gráficas extensas continúan en otra página.
5. Tabla completa de indicadores, alcance y criterios de interpretación. Todas las páginas incluyen fecha de generación en El Salvador y numeración.

La descarga consulta nuevamente `GET /api/admin/statistics` con los filtros aplicados; utiliza su snapshot completo para todas las páginas. El permiso `statistics.read` y el rol administrativo se vuelven a comprobar mediante esa solicitud. Los valores editados en los calendarios deben aplicarse antes de exportar. Mientras se genera el documento se bloquean los clics duplicados y los filtros; los errores conservan los indicadores visibles y permiten reintentar. Cambiar de cuenta, cerrar sesión, salir de la sección o cambiar el rango cancela una exportación pendiente.

Se reutiliza **jsPDF**, ya incluido en el frontend. La generación se carga únicamente al exportar y utiliza texto seleccionable y gráficas vectoriales, sin capturas de pantalla, dependencias adicionales ni servicios externos. Las etiquetas de las tarjetas se comparten con la vista para conservar sus criterios. El logo utiliza el recurso local de la app y tiene un respaldo de texto si no puede cargarse.

El archivo se llama `reporte-operativo_FQA_YYYY-MM-DD_YYYY-MM-DD.pdf`. Solo contiene agregados: no incluye nombres, correos, CV ni información de autenticación. Se genera en memoria y se descarga en el dispositivo; la aplicación no lo almacena en PostgreSQL ni en el backend. El mensaje de éxito indica que se inició la descarga, porque guardar el archivo en el dispositivo depende del navegador.

Las pruebas de `frontend/tests/statistics-report.test.mjs` comprueban el PDF binario, la paginación automática con 85 categorías, el Top 5 con distribuciones extensas, desempates, denominador completo, texto, criterios, porcentajes y resultados vacíos. La aceptación de navegador comprueba descargas reales, errores recuperables, bloqueo de duplicados y cancelación de respuestas de una cuenta anterior.

## Contratos de configuración

Se utiliza exclusivamente `SystemSettings.settingKey = site.configuration`. Su `settingValue` contiene JSON validado:

```json
{
  "version": 1,
  "configuration": {
    "contacto": { "correo": "proyectos@fundaqa.org", "telefono": "+503 7623 4832", "whatsapp": "", "direccion": "San Salvador, El Salvador" },
    "inicio": { "titulo": "Trabaja donde tu historia importa.", "subtitulo": "Texto de portada", "descripcion": "" },
    "institucional": { "mision": "Texto de misión", "vision": "Texto de visión" },
    "redes": { "facebook": "", "instagram": "", "linkedin": "", "youtube": "" }
  }
}
```

Los textos iniciales completos están en `backend/src/constants/site-settings.constants.ts`; el frontend conserva los mismos valores como respaldo. Se mantiene el teléfono, la dirección, el título, el subtítulo y los textos públicos de misión y visión. El correo inicial es `proyectos@fundaqa.org`; descripción adicional, WhatsApp y redes están vacíos inicialmente.

| Endpoint | Contrato |
| --- | --- |
| `GET /api/site-settings` | Público. Devuelve únicamente `configuration`, sin envoltorio, versión, auditoría ni otras claves de `SystemSettings`. |
| `GET /api/admin/site-settings` | Devuelve `{ version, configuration }`. |
| `PUT /api/admin/site-settings` | Recibe el documento completo `{ version, configuration }`; devuelve la nueva versión guardada. |
| `POST /api/admin/site-settings/reset` | Recibe `{ version }`; restaura los valores iniciales y devuelve el documento con versión incrementada. |

Todas las respuestas usan `Cache-Control: no-store`. Las escrituras comprueban origen y cabecera de mutación, sesión, rol y permiso. Guardado/restauración, incremento de versión y auditoría se confirman en una única transacción serializable. Una versión desactualizada o un conflicto concurrente devuelve `409`; la interfaz conserva las ediciones locales y ofrece recargar, advirtiendo que se descartarán. Los errores de validación (`400`) incluyen rutas por campo; un fallo de DB no produce confirmación ni una actualización pública ficticia.

El título es obligatorio (180 caracteres). Los límites restantes son: correo 255, teléfono/WhatsApp 30 y entre siete y quince dígitos, dirección/subtítulo 500, descripción de Home 2000, misión/visión 4000 y enlaces 2048. Los enlaces sociales requieren HTTPS y no admiten credenciales. Todo se trata como texto plano y React lo escapa. Los grupos y campos desconocidos se rechazan; Información de la plataforma, Publicaciones y descripción institucional no forman parte del contrato editable.

Home consume título, subtítulo y descripción; Nosotros consume misión y visión; el pie de Home y la sección de ayuda comparten contacto y redes. Los valores opcionales vacíos ocultan sus contenidos o enlaces. WhatsApp genera un enlace `wa.me` únicamente cuando está configurado. No hay aprobación de vacantes, pausa de postulaciones ni avisos administrativos derivados de configuración.

El proveedor público comparte la última configuración válida: consulta al iniciar, tras guardar, al recuperar foco y cada treinta segundos mientras la página está visible. Ante un error conserva el último valor válido o el inicial. El formulario administrativo mantiene borrador y copia confirmada separados; Administrador tiene campos de consulta y Super Admin puede guardar, cancelar o restaurar con confirmación.

## Seeds y desarrollo

`npm run prisma:seed` sincroniza los tres permisos y crea el documento inicial solamente si no existe. No reemplaza personalizaciones ni modifica otras claves de `SystemSettings`. No se necesita generar ni aplicar una migración para este módulo.

Después de validar las pruebas, aplicar los seeds únicamente al entorno de desarrollo:

```bash
docker compose -f docker-compose.dev.yml exec -T backend npm run prisma:seed
```

## Validación

Ejecutar `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` en ambos proyectos. La suite de integración utiliza el ejecutor existente `npm run test:integration` y exige `TEST_DATABASE_URL` de una base independiente terminada en `_test`. Nunca utilizar la URL de desarrollo o producción como base de integración. El ejecutor prepara sus migraciones y seeds antes de ejecutar las pruebas.

Las pruebas nuevas cubren más de cien vacantes, cuatro tipos, fechas límite salvadoreñas, intentos repetidos, candidatos únicos, usuarios seleccionados alguna vez sin duplicados, cuentas deshabilitadas/eliminadas, CV activos frente a históricos, documentos/estados históricos, resultados vacíos, permisos revocados, auditoría atómica, fallos de DB, seeds idempotentes y conflictos entre editores.

La cobertura incluye categorías compartidas entre tipos, jerarquías, categorías inactivas, vacantes antiguas con intentos recientes, perfiles ausentes, selecciones explícitas de sexo, datos anteriores, límites de edad y cambio de día salvadoreño. Ampliar las estadísticas o exportar reportes no requiere migraciones ni repetir los seeds iniciales.

`backend/tests/helpers/statistics-browser.ts` prepara un servidor desechable solo con `NODE_ENV=test` y una DB `_test`. Usa cuentas ficticias, documentos privados temporales y filas identificadas por ejecución. Para la aceptación visual, publicarlo en `localhost:3100`, iniciar Edge/Chromium con un perfil temporal y depuración remota en `9342`, mantener Vite en `5173` y ejecutar:

```bash
node frontend/tests/browser/statistics-settings.mjs
```

Para ejecutar solo la aceptación de estadísticas y PDF, sin editar configuración del sitio, usar `node frontend/tests/browser/statistics-settings.mjs --statistics-only`. Incluye rangos vacíos, período aplicado, demografía independiente, paginación por teclado, anchos de 390/320 px, errores recuperables, descargas reales y cancelación al cambiar de cuenta.

La prueba utiliza HTTP real contra ese servidor; comprueba escritorio, anchos de 390 y 320 píxeles, teclado, persistencia tras recarga, contenido público, períodos, validaciones, permisos, conflictos y fallos recuperables. Las capturas se escriben en el directorio temporal del sistema, fuera del repositorio. Al terminar, llamar `POST /__test/cleanup` en ese servidor de prueba para eliminar sus filas y restaurar el documento anterior. No ejecutar ese helper en desarrollo ni producción.
