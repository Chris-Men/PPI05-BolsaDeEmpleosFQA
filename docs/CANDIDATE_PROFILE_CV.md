# Perfil profesional y CV — PB-214

## Perfil propio

Solo cuentas con rol Candidato y permisos vigentes acceden a `/api/profile/me`.
Los recursos se seleccionan con la identidad de la sesión, nunca con un ID enviado
por el navegador. Administradores, cuentas mixtas, visitantes, usuarios eliminados
o deshabilitados no pueden usar estas operaciones.

`GET /api/profile/me` devuelve correo, nombres, apellidos, teléfono, fecha de nacimiento, sexo, departamento,
municipio, profesión, nivel educativo, descripción profesional, experiencias,
estudios y habilidades. El correo se consulta pero no se modifica desde el perfil.

`PATCH /api/profile/me` recibe únicamente campos editables. Los omitidos se conservan;
los textos opcionales vacíos o nulos se limpian. Las colecciones presentes reemplazan
sus asociaciones en una sola transacción; `[]` las vacía. El catálogo global de
habilidades se conserva y se reutilizan nombres sin distinguir mayúsculas.
La auditoría registra los nombres de campos modificados, no documentos ni secretos.

`birthDate` utiliza `YYYY-MM-DD` sin zona horaria y se almacena como `DATE`. `sex`
acepta `FEMALE`, `MALE` o `UNDISCLOSED` (Femenino, Masculino y Prefiero no indicar).
Ambos admiten `null` o texto vacío para limpiar el dato; omitirlos conserva el valor.
El perfil puede permanecer incompleto. Una fecha ingresada debe existir y corresponder
a una persona con 16 años cumplidos según el calendario de `America/El_Salvador`.

`GET /api/profile/catalogs` requiere el mismo rol y permiso de lectura del perfil.
Devuelve `{ locationZones, educationLevels, sexes }`; `sexes` contiene objetos
`{ value, label }`. Los niveles son Sin estudios, Educación básica, Bachillerato,
Técnico, Universitario y Posgrado. Las ubicaciones también se incluyen como
`locationZones` en los catálogos de vacantes y proceden de una definición única.

Perfil y postulación comparten selectores de departamento agrupado por zona y
municipio dependiente, sin un campo adicional de Zona. Cambiar departamento limpia
municipio. En el perfil puede guardarse solo departamento; si se incluye municipio,
debe pertenecer al departamento efectivo, considerando también los valores omitidos.
Los valores históricos se muestran como anteriores y no se convierten automáticamente.
El editor envía únicamente campos modificados para conservar datos históricos ajenos
al cambio. Los errores aparecen junto al campo al salir de él y antes de guardar.

Nombres y apellidos admiten hasta 100 caracteres; teléfono 30; ubicación y nivel
educativo 100; profesión 150; descripción 5.000. Se permiten 50 elementos por
colección. Los apellidos vacíos preservan la compatibilidad con cuentas registradas
con un solo nombre. Las fechas usan `YYYY-MM-DD`, deben existir y la final no puede
preceder a la inicial. `endDate: null` representa trabajo o estudios actuales.

Nombres y apellidos admiten letras Unicode, tildes, espacios, puntos, apóstrofes y
guiones, con al menos una letra. Los teléfonos aceptan ocho dígitos con espacios,
guiones y prefijo `+503` opcional; el servidor guarda los ocho dígitos normalizados.

La sección **Datos Personales**, debajo de **Mi perfil** en la barra lateral,
permite consultar, editar, cancelar y guardar el perfil profesional. El nombre confirmado
por el servidor se actualiza en la sesión y las otras pestañas. Al iniciar una nueva
postulación se precarga el perfil; volver entre pasos conserva las ediciones locales.
PB-238 conecta las postulaciones con borradores persistentes, snapshots y documentos históricos; consulta [Flujo de postulación](APPLICATION_FLOW.md).

## CV privado

| Método y ruta | Resultado |
| --- | --- |
| GET /api/profile/me/resume | Metadatos del CV activo o `null`. |
| PUT /api/profile/me/resume | Subida o reemplazo, multipart con un único campo `file`. |
| GET /api/profile/me/resume/download | PDF adjunto, autenticado y sin caché. |
| DELETE /api/profile/me/resume | Desvinculación idempotente del CV activo, respuesta 204. |

Los metadatos son `id`, `originalName`, `mimeType`, `sizeBytes` y `createdAt`.
No se devuelven claves ni rutas de almacenamiento. Cada candidato tiene un CV
activo. Perfil y formulario usan los mismos controles y estado.

Se acepta exclusivamente PDF no vacío de hasta 5 MiB (5.242.880 bytes). El backend
verifica extensión, MIME declarado, cabecera PDF y marcador final. Multer se añade
para procesar multipart con límites de archivos, campos y tamaño, después de autenticar.
Estas comprobaciones no realizan análisis antivirus ni interpretación del documento.

Los archivos reciben claves UUID, fuera de directorios públicos y con permisos
privados. La escritura antecede a la transacción de metadatos y vínculo activo; si
esta falla, se compensa el archivo nuevo y se conserva el CV anterior.
La eliminación del CV activo no altera archivos asociados a postulaciones.

Cada 15 minutos se ejecuta limpieza reintentable de CV modernos sin referencias,
con una hora de gracia. Antes de borrar metadatos se revalidan vínculos de perfil,
postulaciones y adjuntos; después se elimina el objeto. Un barrido posterior elimina
objetos huérfanos antiguos, incluyendo compensaciones fallidas. Archivos históricos
sin metadatos modernos se conservan. El borrado lógico de cuentas conserva su CV.

## Almacenamiento y Docker

En desarrollo Compose monta `resume_data` exclusivamente en el backend, en
`/app/private/resumes`, y establece:

```dotenv
RESUME_STORAGE_DRIVER=filesystem
RESUME_STORAGE_DIRECTORY=/app/private/resumes
```

Al ejecutar el backend directamente, usar `./private/resumes`. La carpeta está
ignorada en Git y excluida del contexto de construcción Docker. Los documentos
permanecen al recrear el contenedor mientras se conserve el volumen. No ejecutar
`docker compose down -v` si se desean conservar los datos.

Frontend y PostgreSQL conservan sus puertos, volúmenes y contratos actuales.
La migración aditiva `20261004223220_candidate_profile_resume` amplía perfiles y
metadatos y vincula explícitamente el CV activo. Aplicar migraciones y regenerar
Prisma antes de iniciar esta versión del backend.

La migración aditiva `20261024064330_candidate_personal_fields` agrega los dos campos
opcionales y el enum `Sex`, sin sustituir perfiles existentes. Después de aplicarla,
los respaldos nuevos incluyen ambos datos; los respaldos anteriores conservan la
restricción de compatibilidad exacta del historial de migraciones al importar o restaurar.

En producción todavía debe elegirse volumen privado o DigitalOcean Spaces.
No se configura un proveedor implícito: sin configuración, los endpoints de CV
devuelven 503 y el resto de la API funciona. Para filesystem deben configurarse
**ambas** variables en el contenedor y montar un volumen persistente privado en
ese directorio mediante la configuración de despliegue. `docker-compose.yml`
no habilita almacenamiento hasta tomar esa decisión.

`ResumeStorage` define escritura, lectura, eliminación y listado de objetos antiguos.
Un futuro adaptador Spaces implementará ese contrato y mantendrá el bucket privado;
el navegador seguirá descargando a través de la API autenticada.

## Verificación

Ejecutar tipos, lint, pruebas y compilación de frontend/backend. La integración usa
una base exclusiva terminada en `_test`; el runner crea y limpia un directorio de
CV temporal sin utilizar el volumen de desarrollo.

Los escenarios cubren persistencia, fechas, permisos, aislamiento, multipart,
descarga de bytes exactos, límites, reemplazo, compensación y limpieza de huérfanos.

Validación de esta implementación: tipos, lint y compilación de ambos proyectos;
21 pruebas de frontend, 79 unitarias de backend y 91 de integración aprobadas.
Se comprobó el flujo en navegador a 1440 y 390 píxeles con una API y base `_test`
independientes: guardar y cancelar, recarga, descarga, CV compartido, precarga de
postulación y cambio de cuenta. Recrear el contenedor temporal de la API conservó
los metadatos y los mismos bytes del CV en su volumen privado.
