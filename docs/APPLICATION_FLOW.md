# PB-238 — Flujo de postulación

Empleos, prácticas, horas sociales y voluntariado comparten un formulario persistente de cuatro pasos. Los datos del perfil precargan el borrador; editar el formulario no modifica los datos personales del perfil. El correo procede de la cuenta y es de consulta. El control compartido de CV gestiona el documento activo del perfil y permite seleccionar otro documento propio para el borrador.

El CV es obligatorio en empleos y prácticas y opcional en voluntariado y horas sociales. Se mantienen las comprobaciones de PDF de hasta **5 MiB** de PB-214. La selección del documento queda referenciada en el borrador y posteriormente en el intento: reemplazar o eliminar el CV activo no altera estos documentos.

El paso de documentos reúne todos los controles en un único bloque que muestra el CV seleccionado para esa postulación. Permite subir o reemplazar el documento, descargar el seleccionado y utilizar explícitamente el CV actual del perfil cuando sea diferente; en los tipos opcionales también permite continuar sin CV. La descarga guarda primero los cambios pendientes del borrador. «Eliminar CV del perfil» mantiene el documento del borrador y explica esa diferencia; la gestión de documentos dentro del perfil conserva sus controles habituales.

## Modelo y compatibilidad

La migración generada por Prisma `20261011203922_application_flow` conserva las filas existentes. Amplía `Applications` con origen opcional de voluntariado, número de intento, versión, clave de envío y snapshots JSON del formulario, perfil profesional y vacante. Cada escritura de la API establece exactamente un origen y comprueba su identidad. `VolunteerRegistrations` conserva su unicidad por candidato y oportunidad; varios intentos se vinculan a la misma inscripción.

Se sustituye la unicidad candidato/empleo por candidato/empleo/intento; el servicio permite otro intento únicamente después de una retirada. Se conserva la referencia única de los intentos antiguos y se asigna una referencia `FQA-año-UUID` a los nuevos. La versión inicial es 1.

`ApplicationDrafts` guarda datos parciales, paso, versión, perfil inicial y CV seleccionado. Hay un borrador por candidato y origen. `Notifications` agrega relación con el intento y una clave de evento única. El historial admite una explicación opcional de hasta 2.000 caracteres.

Los seeds añaden estados y permisos sin sustituir sus identificadores. Importan cada inscripción antigua de voluntariado sin intento como un registro pendiente `FQA-LEGACY-V-id`, manteniendo su fecha. No envían correos retroactivos. Las postulaciones antiguas siguen conservando documentos e historial; el detalle señala que el formulario original no fue guardado. Los estados históricos desconocidos se muestran sin reinterpretarlos ni permitir transiciones.

## API

Todas las rutas siguientes comienzan en `/api`, requieren sesión y devuelven `Cache-Control: no-store`. Los permisos se consultan en PostgreSQL en cada solicitud. Las mutaciones utilizan la protección de origen y cabecera `X-FQA-Request` existente.

| Operación | Ruta |
|---|---|
| Listar / crear borrador | `GET /application-drafts` / `POST /application-drafts` |
| Consultar / guardar / descartar borrador propio | `GET`, `PATCH`, `DELETE /application-drafts/:id` |
| Descargar CV seleccionado | `GET /application-drafts/:id/resume/download` |
| Enviar borrador | `POST /applications` |
| Listar / consultar intentos propios | `GET /applications`, `GET /applications/:id` |
| Retirar intento propio | `PATCH /applications/:id/withdraw` |
| Descargar documento enviado | `GET /applications/:id/resume/download` |
| Listar / consultar desde administración | `GET /admin/applications`, `GET /admin/applications/:id` |
| Guardar decisión | `PATCH /admin/applications/:id/status` |
| Descargar desde administración | `GET /admin/applications/:id/resume/download` |
| Agregados de todos los registros filtrados | `GET /admin/applications/statistics` |
| Notificaciones propias | `GET /notifications` |
| Leer una / todas | `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |

Crear borrador recibe `{ "opportunityKey": "job-123" }` o `volunteer-123`. Guardar recibe:

```json
{
  "version": 1,
  "currentStep": 2,
  "resumeId": null,
  "data": {
    "personal": {
      "firstName": "Ana", "lastName": "Rivera", "phone": "70000000",
      "birthDate": "2000-02-29", "sex": "UNDISCLOSED",
      "department": "San Salvador", "municipality": "San Salvador Centro",
      "profession": "Docente", "educationLevel": "Universitario"
    },
    "experience": {
      "lastRole": "Docente", "lastOrg": "Fundación",
      "skills": "Comunicación", "motivation": "Quiero contribuir."
    }
  }
}
```

Los borradores admiten campos vacíos y ediciones incompletas; al enviar se exigen nombres, apellidos, teléfono, fecha de nacimiento, sexo, departamento, municipio, nivel educativo y motivación. Profesión y experiencia previa siguen siendo opcionales. Los límites son los del perfil: nombres/apellidos 100, teléfono 30, departamento/municipio/nivel educativo 100, profesión 150, último cargo 100, organización anterior 150 y habilidades/motivación 5.000 caracteres. La formación y experiencia completas del perfil inicial se conservan como snapshot adicional.

Perfil y postulación utilizan los mismos catálogos y validaciones: nombres con letras Unicode y separadores, teléfono salvadoreño normalizado a ocho dígitos y nacimiento real con al menos 16 años cumplidos en `America/El_Salvador`. Sexo requiere una selección explícita entre `FEMALE`, `MALE` y `UNDISCLOSED`; esta última significa Prefiero no indicar. Departamento, municipio y educación deben pertenecer al catálogo de `/api/profile/catalogs`, y el municipio al departamento elegido. La UI usa Departamento → Municipio sin selector de Zona, limpia el municipio al cambiar departamento y muestra errores al escribir, salir del campo, avanzar o enviar. El teléfono comparte la máscara `+503 0000-0000`; consulta [controles y validaciones](FORM_CORRECTIONS.md).

La validación de lectura y autoguardado permanece separada de la validación final. Los JSON anteriores sin `birthDate` o `sex` se devuelven con cadenas vacías, sin reescribir el registro ni perder otros datos. Los snapshots profesionales anteriores devuelven ambos como `null`. Las selecciones antiguas siguen visibles, pero deben corregirse antes de un nuevo envío. Los errores del servidor regresan al paso correspondiente y enfocan el primer campo inválido.

Enviar recibe `{ "draftId": "UUID", "version": 2 }`. El identificador se conserva como clave única de idempotencia: repetir el envío devuelve el mismo intento aunque el borrador haya sido consumido. Retirar recibe `{ "version": 1 }`; decidir recibe `{ "version": 1, "status": "SELECTED", "reason": "Explicación opcional" }`. Un conflicto de versión devuelve **409**, sin sobrescribir cambios ajenos.

Los listados devuelven `{ items, total, page, pageSize }`. Valores predeterminados: página 1, 20 elementos; máximo 100. Los filtros de postulaciones son `kind`, `status`, `opportunityKey`, `search`, `from`, `to`; administración admite también `candidateId` y `organizationId`. Las fechas usan `YYYY-MM-DD`, ambos extremos incluidos. Las notificaciones agregan `unreadCount` global y admiten filtro `unread=true|false`.

Los permisos propios son `applications.create.own`, `applications.read.own`, `applications.withdraw.own`, `notifications.read.own` y `notifications.update.own`. Administración reutiliza `applications.read.any`, `applications.select` y, para descargar, `applications.resume.read.any`. Siempre se exige el rol correspondiente además del permiso; conocer un ID o una referencia no concede acceso.

## Estados, envío y cupos

| Estado | Etiqueta | Transiciones permitidas |
|---|---|---|
| `PENDING` | Pendiente | En revisión, seleccionada, rechazada o retirada propia |
| `IN_REVIEW` | En revisión | Seleccionada, rechazada o retirada propia |
| `SELECTED` | Seleccionada | Final |
| `REJECTED` | Rechazada | Final |
| `WITHDRAWN` | Retirada | Final; un nuevo envío crea otro intento |

El envío revalida publicación, fecha, organización, categoría, cupos y ausencia de otro intento activo. Postulación, historial, auditoría, notificación, correo pendiente y consumo del borrador se guardan juntos en una transacción serializable, con hasta tres intentos ante conflictos de escritura.

Seleccionar el último cupo cierra la vacante dentro de la misma transacción, sin rechazar las candidaturas restantes. Reducir los cupos hasta el número ya seleccionado también cierra una vacante publicada. Antes de seleccionar más hay que ampliar cupos. No se permite reducirlos por debajo de los seleccionados ni publicar una vacante llena. Se pueden resolver candidaturas recibidas después de un cierre manual o vencimiento. Archivar conserva consulta, rechazo y retirada, pero bloquea selecciones nuevas.

Las descargas autorizan el recurso antes de leer el almacenamiento privado y devuelven el PDF original como adjunto, sin rutas públicas. La limpieza de archivos respeta el CV activo, borradores, postulaciones y adjuntos históricos.

## Pantallas y correo

La URL `/?postular=job-123` o `/?postular=volunteer-123` identifica únicamente la vacante. Se conserva durante login o registro. El formulario recupera el borrador de la DB, guarda tras una espera de 800 ms y al cambiar de paso, y espera a guardar antes de enviar, salir o cerrar sesión. Muestra conflictos y errores recuperables; la confirmación aparece solamente tras una respuesta exitosa, con la referencia real.

**Mis postulaciones** muestra los cuatro tipos, filtros, páginas, historial y retirada con confirmación. Incluye borradores para retomar o descartar. **Notificaciones** muestra el contador real y permite lectura individual o de todas. Se actualiza al recuperar foco y cada 30 segundos cuando la página está visible. El estado del frontend se desmonta al cambiar de cuenta.

**Postulaciones** sustituye el acceso a **CV Recibidos** en administración. Permite consulta, revisión, selección y rechazo con confirmación, explicación y versión. Los indicadores de postulaciones, candidatos postulantes y documentos proceden de agregados de la API, independientemente de la página visible. No se incluye agenda de entrevistas.

El detalle compartido de candidato y administrador se muestra en un diálogo centrado que restaura explícitamente los márgenes anulados por el reset global. Mantiene la paleta y las tarjetas de la página, una cabecera fija y desplazamiento interno para consultar documentos e historial completos. Se adapta a móvil, evita desbordes horizontales y oculta el bloque profesional cuando no contiene información. El diálogo tiene título accesible, admite cierre con Escape y conserva un foco seguro al desmontarse.

El envío y las decisiones de selección/rechazo encolan mensajes cifrados mediante la cola existente. La revisión también genera notificación interna. Un fallo SMTP no revierte la operación y se reintenta; las claves de evento evitan encolados duplicados. Se mantiene la entrega al menos una vez del trabajador SMTP existente ante un reinicio durante el envío.

## Instalación y validación

Antes de habilitar esta rama, aplicar migraciones y seeds sobre desarrollo, después de validar en una base independiente cuyo nombre termine en `_test`:

```powershell
docker compose -f docker-compose.dev.yml exec backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml exec backend npm run prisma:seed
```

No se modificó Compose. Desarrollo reutiliza el volumen privado de PB-214, exclusivo del backend. En producción sigue pendiente configurar explícitamente un proveedor privado; no existe una caída automática a almacenamiento efímero. Sin proveedor, enviar o descargar un CV devuelve **503** y conserva el borrador. Voluntariado y horas sociales pueden enviarse seleccionando **Continuar sin CV**. La futura integración con DigitalOcean Spaces debe implementar `ResumeStorage`.

Tipos, lint, pruebas unitarias y compilación se ejecutan en ambos proyectos. `backend/tests/integration/applications.test.ts` recorre los cuatro tipos, CV obligatorio/opcional, snapshots y documentos históricos, doble envío, versiones, retirada/nuevo intento, cupos concurrentes, cierre/vencimiento/archivo, permisos, filtros, notificaciones, rollback y SMTP/Mailpit. El ejecutor existente usa `TEST_DATABASE_URL`, una carpeta temporal de CV y las dependencias de Docker.

La revisión visual manual usa `backend/tests/helpers/application-browser.ts`: rechaza entornos distintos de `test` y bases que no terminen en `_test`, prepara tres cuentas temporales y cuatro vacantes, y escucha en 3001. Su configuración debe provenir del entorno de pruebas, con claves temporales. Para el cliente CDP `frontend/tests/browser/application-flow.mjs`, exponer esa API de pruebas solamente en localhost:3100, mantener el frontend en localhost:5173 y abrir Edge headless con un perfil temporal y depuración en 9338. Ejecutar `node frontend/tests/browser/application-flow.mjs`: revisa anchos de 1440 y 390 píxeles, recuperación del borrador, PDF, errores sin confirmación falsa, decisiones, notificaciones, logout y cambio de cuenta. Guarda capturas en el directorio temporal y elimina sus fixtures y documentos al finalizar.

No incluir cuentas de prueba, documentos, secretos ni archivos temporales en los commits. Home, Empleos, Compose y SETUP conservan los cambios locales previos fuera de PB-238.

La cabecera del candidato incluye una campana junto al avatar, disponible con `notifications.read.own`. Muestra las cinco notificaciones más recientes y el total de no leídas calculado por la API. Al abrir una notificación, se marca como leída si tiene el permiso de actualización y se consulta su postulación. **Ver todas** abre la sección Notificaciones del perfil, incluso si ya está abierta otra sección; antes de salir del formulario se guarda su borrador. Las lecturas y los envíos confirmados invalidan los contadores de cabecera, barra lateral y lista sin compartir datos entre cuentas. Se mantienen la actualización al recuperar foco y cada treinta segundos, el cierre con Escape/clic exterior y los estados de carga, lista vacía y error recuperable. En móvil la lista se ajusta al ancho de pantalla y conserva desplazamiento interno.

Las tarjetas de actividad de **Mi perfil** cambian el panel inferior sin salir del resumen. Postulaciones, Empleos y Voluntariados muestran hasta cinco intentos recientes, con vacante, organización, tipo, fecha y estado; Estudiantes reúne horas sociales y prácticas, ordenadas por fecha. Los totales proceden de la API, incluidos los de cada tipo de estudiantes. Guardadas consulta sus vacantes persistentes de los cuatro tipos, con diez por página y total del servidor; conserva las no disponibles y permite quitarlas. Véase [Guardados persistentes](SAVED_OPPORTUNITIES.md). Mis Documentos permanece a la derecha. El panel incluye carga, lista vacía, error recuperable y acceso a **Mis postulaciones**, donde se consultan datos completos, historial, borradores y retirada. Cada selección monta su consulta independiente y la sesión descarta el estado al cambiar de cuenta.

Validación de las tarjetas: 35 pruebas existentes del frontend, tipos, lint y compilación correctos. La revisión en Edge con API simulada y aislada cubre 1440, 390 y 320 píxeles: cinco selecciones, totales mayores que la página visible, mezcla de horas sociales/prácticas, teclado, carga, errores/reintento, vacíos, cambios rápidos con respuestas tardías, guardadas, acceso al detalle desde Mis postulaciones y cierre/cambio de cuenta sin conservar datos anteriores.

Validación de la campana: 35 pruebas unitarias del frontend y tipos, lint y compilación correctos. La revisión en Edge con respuestas de API aisladas cubrió anchos de 1440, 390 y 320 píxeles, apertura de detalle, contadores sincronizados, navegación repetida, cierre con Escape y clic exterior, errores/reintento, lista vacía, permisos y cierre de sesión/cambio de cuenta sin conservar notificaciones anteriores.

Validación de esta entrega: 115 pruebas de integración, 86 unitarias del backend y 33 del frontend; tipos, lint y compilación de ambos proyectos correctos. La revisión CDP completó los cuatro tipos, administración, notificaciones, recuperación tras recarga, cambios escritos justo antes de logout y aislamiento al cambiar de cuenta, en escritorio y móvil. Se aplicaron migración y seeds a desarrollo; el esquema quedó actualizado. Un PDF temporal conservó su hash al recrear únicamente el backend y después fue eliminado; frontend y PostgreSQL conservaron sus contenedores.
