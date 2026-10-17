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

La interfaz abre los últimos treinta días, incluyendo hoy en El Salvador. Los períodos rápidos de treinta días, noventa días, este año y **Desde el inicio** aplican inmediatamente y sincronizan Desde/Hasta. **Desde el inicio** consulta desde el primer día de actividad guardada hasta hoy, ambos en horario salvadoreño; si al actualizar se encuentra actividad más antigua, amplía automáticamente el rango. La edición manual requiere **Aplicar** y cambia el selector a Personalizado. Un rango inválido conserva el último rango aplicado. Una solicitud fallida muestra error, reintento y valores desconocidos (`—`), sin presentar el fallo como un resultado vacío.

El resumen operativo diferencia mediante sus etiquetas los datos acumulados, los del período y los actuales. **Usuarios registrados** y **Usuarios con alguna selección** utilizan únicamente candidatos activos y no eliminados; el segundo representa personas únicas seleccionadas sobre esa misma población. **Candidatos registrados** conserva el total de candidatos activos y deshabilitados, sin eliminados. **Tasa de selección del período** representa postulaciones seleccionadas sobre intentos recibidos en las fechas consultadas. Una misma persona puede tener varias postulaciones seleccionadas y solo cuenta una vez en el indicador de usuarios.

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

Validación de esta entrega: 88 pruebas unitarias del backend, 43 del frontend y 133 de integración aprobadas, además de tipos, lint y compilación de ambos proyectos. Los seeds iniciales se aplicaron al desarrollo local y se verificaron la clave inicial, los tres permisos y sus cinco asignaciones canónicas; ampliar el resumen operativo no requiere repetirlos. No se aplicaron migraciones ni cambios en producción.

`backend/tests/helpers/statistics-browser.ts` prepara un servidor desechable solo con `NODE_ENV=test` y una DB `_test`. Usa cuentas ficticias, documentos privados temporales y filas identificadas por ejecución. Para la aceptación visual, publicarlo en `localhost:3100`, iniciar Edge/Chromium con un perfil temporal y depuración remota en `9342`, mantener Vite en `5173` y ejecutar:

```bash
node frontend/tests/browser/statistics-settings.mjs
```

La prueba utiliza HTTP real contra ese servidor; comprueba escritorio, anchos de 390 y 320 píxeles, teclado, persistencia tras recarga, contenido público, períodos, validaciones, permisos, conflictos y fallos recuperables. Las capturas se escriben en el directorio temporal del sistema, fuera del repositorio. Al terminar, llamar `POST /__test/cleanup` en ese servidor de prueba para eliminar sus filas y restaurar el documento anterior. No ejecutar ese helper en desarrollo ni producción.
