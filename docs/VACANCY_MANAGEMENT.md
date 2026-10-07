# PB-129 — Vacantes y categorías

El panel y el catálogo público usan la API y PostgreSQL para empleos, voluntariados, horas sociales y prácticas profesionales. Las postulaciones de candidatos, su revisión, favoritos y notificaciones quedan para otros tickets; sus flujos existentes no se convierten en persistentes con PB-129.

## Datos y migración

`JobCategories` sigue siendo el catálogo compartido. Se agregan descripción y disponibilidad, conservando la jerarquía y todas las relaciones existentes.

`Jobs` conserva postulaciones, revisiones y habilidades. Su nuevo discriminador `kind` diferencia `EMPLOYMENT`, `SOCIAL_HOURS` e `INTERNSHIP`; los registros existentes reciben `EMPLOYMENT`. `VolunteerOpportunities` mantiene su tabla e inscripciones. Las claves de API `job-123` y `volunteer-123` evitan colisiones entre las dos identidades numéricas. El tipo de una vacante guardada es inmutable.

La migración `20261007194923_vacancies_and_categories` fue generada por Prisma. Agrega campos de contenido, modalidad, cupos, salario y datos específicos; permite referencias opcionales para guardar borradores. No elimina tablas, registros ni relaciones. Los catálogos de estados, jornadas y experiencia se preparan con el seed idempotente, sin insertar organizaciones, categorías o vacantes de demostración.

Antes de habilitar esta rama, aplicar las migraciones y el seed:

```bash
docker compose -f docker-compose.dev.yml run --rm backend npm run prisma:deploy
docker compose -f docker-compose.dev.yml run --rm backend npm run prisma:seed
docker compose -f docker-compose.dev.yml up -d backend frontend
```

En producción, ejecutar `npm run prisma:deploy` y `npm run prisma:seed:production` en el backend de la versión desplegada. Los estados históricos no reconocidos se muestran como «Estado anterior» y permanecen fuera del catálogo público hasta que un administrador revise y publique esos registros. La configuración pendiente de almacenamiento privado de CV de PB-214 sigue siendo independiente.

## Ciclo de vida

- Crear guarda un **Borrador** con título y tipo. El título admite 3–150 caracteres; la descripción, hasta 20000; cada lista admite 50 elementos de hasta 1000 caracteres.
- Publicar requiere descripción de al menos 20 caracteres, organización y categoría activas, departamento y municipio. Un empleo requiere jornada o contrato; horas sociales requiere su cantidad; una práctica requiere duración. La fecha de cierre, si existe, debe ser futura.
- La jornada o contrato, la modalidad y el tipo de oportunidad son conceptos diferentes. El salario se expresa en USD con hasta dos decimales y rango coherente; solo se acepta para empleos.
- Departamento y municipio se guardan juntos. Las listas enviadas reemplazan su contenido; las omitidas se conservan. Las actualizaciones publicadas vuelven a comprobar los requisitos antes de confirmar la transacción.
- Cerrar retira una vacante del portal. Puede volver a publicarse después de validar sus datos y fecha.
- Archivar es lógico, idempotente y definitivo. No elimina postulaciones, inscripciones, revisiones ni documentos; las vacantes archivadas no se editan. Se consultan con el filtro administrativo de archivadas.
- El portal muestra únicamente publicaciones vigentes, sin archivo, con organización y categoría activas. Tanto la lista como el detalle verifican esta condición. La fecha de cierre representa el final del día indicado en UTC.
- Los cambios y su auditoría se confirman en una transacción serializable con reintentos por conflictos. Las ediciones de `Jobs` agregan una revisión de título y descripción.

## API

| Método y ruta | Operación / permiso administrativo |
| --- | --- |
| `GET /api/opportunities` | Listado público, sin sesión |
| `GET /api/opportunities/:key` | Detalle público vigente |
| `GET /api/opportunities/catalogs` | Opciones para filtros |
| `GET /api/categories` | Categorías activas, sin métricas administrativas |
| `GET /api/admin/opportunities` | Listado — `opportunities.read` |
| `GET /api/admin/opportunities/catalogs` | Opciones del editor — `opportunities.read` |
| `GET /api/admin/opportunities/:key` | Detalle administrativo — `opportunities.read` |
| `POST /api/admin/opportunities` | Crear borrador — `opportunities.create` |
| `PATCH /api/admin/opportunities/:key` | Editar — `opportunities.update` |
| `PATCH /api/admin/opportunities/:key/status` | `{ "status": "OPEN" \| "CLOSED" }` — `opportunities.status.update` |
| `DELETE /api/admin/opportunities/:key` | Archivar — `opportunities.archive` |
| `GET /api/admin/categories` | Listado — `categories.read` |
| `POST /api/admin/categories` | Crear — `categories.create` |
| `PATCH /api/admin/categories/:id` | Editar/activar/desactivar — `categories.update` |
| `DELETE /api/admin/categories/:id` | Eliminar categoría sin referencias — `categories.delete` |

Todas las rutas administrativas requieren Administrador o Super Admin **y** el permiso correspondiente, verificados en el backend con los grants vigentes. Las mutaciones también aplican la protección de sesión del transporte central. Los candidatos no pueden gestionar vacantes aunque reciban un permiso administrativo por error.

Los filtros de vacantes son `search`, `kind`, `categoryId`, `organizationId`, `location`, `salaryMax`, `page`, `pageSize` y, solo para administración, `status`. La búsqueda consulta título y organización, sin distinguir mayúsculas; ubicación consulta departamento y municipio. `salaryMax` limita el máximo publicado o, si se omitió, el mínimo conocido, excluyendo salarios sin información.

La paginación admite hasta 100 elementos por página y una ventana de 10000 registros: cada tabla filtra en PostgreSQL y obtiene un prefijo acotado de identidades y fechas; después se mezclan por fecha de creación descendente, identidad descendente y clave, dejando fechas nulas al final. El contenido completo se carga únicamente para la página solicitada. El total, ambos prefijos y el contenido se consultan en una transacción de lectura consistente. Para superar la ventana debe refinarse la búsqueda.

Las categorías admiten búsqueda, `state=ACTIVE|INACTIVE` y paginación. El nombre genera un slug normalizado, evitando duplicados por mayúsculas y acentos. Se comprueba toda la cadena de padres para evitar ciclos. Una categoría con vacantes o subcategorías devuelve `409` al eliminarse; puede desactivarse conservando sus relaciones. La disponibilidad se aplica a cada categoría seleccionada, no se hereda de sus padres.

## Frontend y verificación

«Nueva Vacante» y «Administrar Vacantes» comparten el editor para los cuatro tipos. Guardar y publicar son operaciones separadas: si falla la publicación, el borrador ya guardado se conserva y puede corregirse sin crear otra vacante. Categorías usa modales nativos, confirmación de eliminación y errores dentro del modal. La navegación y los botones respetan permisos; la API conserva la autoridad.

Empleos, voluntariados y las pestañas de horas sociales y prácticas consultan vacantes reales con búsqueda, categorías y paginación. Todos los tipos permiten consultar su detalle actualizado; voluntariados y estudiantes comparten el modal de consulta con administración. No se muestran salarios, visualizaciones ni compatibilidades ficticias. El estado público de las vacantes es independiente de la cuenta; el estado administrativo se desmonta al salir o cambiar de identidad.

Ejecutar `typecheck`, `lint`, `test` y `build` en frontend y backend. Para integración se requiere `TEST_DATABASE_URL` explícita, distinta de la base normal y con nombre terminado en `_test`; el runner aplica migraciones, seed y todas las pruebas sobre esa base. Las pruebas cubren los cuatro ciclos de vida, filtros y páginas mixtas, categorías y ciclos, permisos revocados, expiración, rollback de auditoría y conservación de relaciones históricas. La validación de navegador utiliza una API temporal y esa misma base independiente, con usuarios de prueba, en 1440 y 390 píxeles.
