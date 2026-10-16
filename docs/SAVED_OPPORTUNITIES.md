# PB-238 — Guardados persistentes

El candidato puede guardar empleos, prácticas, horas sociales y voluntariados. Home y el detalle de empleo conservan sus botones actuales; las tarjetas de voluntariado y estudiantes utilizan el mismo componente. **Mi perfil → Guardadas** muestra diez vacantes por página y el scorecard presenta el total del servidor. Mis Documentos y los demás resúmenes permanecen disponibles.

## Persistencia y compatibilidad

`SavedJobs` conserva las filas, identificadores y fechas de los tres tipos almacenados en `Jobs`. `SavedVolunteerOpportunities` añade relaciones explícitas con `User` y `VolunteerOpportunities`, fecha y unicidad por candidato/oportunidad. La migración aditiva generada por Prisma `20261014220201_saved_opportunities` crea únicamente esa tabla, sus claves e índices y un índice adicional sobre `SavedJobs`.

Las claves `job-ID` y `volunteer-ID` evitan colisiones entre tablas. El listado combina ambas fuentes dentro de una transacción con aislamiento Repeatable Read: fecha descendente, fechas nulas al final, identificador descendente y clave como desempate estable. Las consultas recuperan los prefijos necesarios para la página y cargan resúmenes únicamente de sus elementos. El límite de consulta es de 10.000 posiciones.

Los guardados conservan una relación con la vacante, no una copia histórica de su contenido: reflejan los cambios actuales de título, organización y categoría. Cerrar, vencer, archivar o desactivar la organización/categoría conserva el guardado y permite quitarlo; **Ver vacante** se deshabilita cuando deja de estar disponible. No se incorpora eliminación física de vacantes: esa operación eliminaría sus relaciones mediante las claves foráneas existentes.

## API y autorización

Todas las rutas requieren sesión y responden con `Cache-Control: no-store`. La identidad procede exclusivamente de la sesión; no se aceptan identificadores de candidatos en cuerpos o filtros. El backend comprueba el rol Candidato y sus permisos vigentes en cada solicitud. Los seeds canónicos conceden `saved-opportunities.read.own` y `saved-opportunities.update.own` solamente al candidato.

| Operación | Ruta | Resultado |
|---|---|---|
| Listado propio | `GET /api/saved-opportunities?page=1&pageSize=10` | `{ items, total, page, pageSize }` |
| Claves propias | `GET /api/saved-opportunities/keys` | `{ keys, total }` |
| Guardar | `PUT /api/saved-opportunities/:key` | `204`, sin cuerpo |
| Quitar | `DELETE /api/saved-opportunities/:key` | `204`, sin cuerpo |

Cada resumen incluye `key`, `kind`, `title`, `organization`, `category`, `department`, `municipality`, `status`, `savedAt` y `available`. No expone postulaciones, documentos, datos personales ni contenido privado de la vacante.

PUT es idempotente y conserva la fecha original. Un guardado ya existente sigue siendo válido aunque la vacante haya cerrado. Para uno nuevo se reutilizan las reglas de publicación, vigencia, archivo, organización y categoría de las vacantes públicas/postulaciones. Las transacciones serializables reintentan conflictos hasta tres veces; los conflictos restantes devuelven un error recuperable `409`. DELETE afecta únicamente al candidato autenticado y también es idempotente.

## Sincronización y sesión

Un estado compartido por cuenta conecta botones, contador y lista. Las mutaciones bloquean clics repetidos por clave y cambian el estado confirmado únicamente después del éxito de la API. Un fallo muestra un mensaje y permite reintentar; no anuncia éxito ni elimina el estado confirmado anterior. Las claves y la página visible se actualizan después de cada cambio, al recuperar foco y cada treinta segundos mientras la aplicación está visible.

Guardar sin sesión añade `?guardar=job-ID` o `?guardar=volunteer-ID` y abre login. La clave permanece durante registro y recarga; después de autenticar se guarda y se abre Guardadas. Login/registro permiten cancelar. La intención se elimina tras éxito, cancelación, cierre de sesión o cambio de cuenta. La URL nunca contiene datos personales.

El transporte central utiliza `expectedUserId` como precondición interna: no se transmite al backend. Se verifica antes de enviar, después de recibir y después de leer el cuerpo. La renovación JWT conserva los reintentos de la misma cuenta; una respuesta o reintento perteneciente a otra identidad se rechaza. Los componentes se remontan por identidad y cancelan solicitudes anteriores.

## Preparación y comprobaciones

Después de validar en una base independiente terminada en `_test`, aplicar al **desarrollo local**:

```sh
docker compose -f docker-compose.dev.yml exec -T backend npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec -T backend npm run prisma:seed
docker compose -f docker-compose.dev.yml exec -T backend npm run prisma:generate
docker compose -f docker-compose.dev.yml restart backend
```

No requiere cambios en Compose, nuevos volúmenes ni almacenamiento de documentos. En producción deberá aplicarse la migración y los seeds como parte de un despliegue aprobado; esta entrega no despliega producción.

Ejecutar `typecheck`, `lint`, `test` y `build` en ambos proyectos. Para integración, configurar `TEST_DATABASE_URL` con una base independiente terminada en `_test` y ejecutar `npm run test:integration` en backend. El runner verifica aislamiento, aplica migraciones y seeds y utiliza documentos temporales.

La suite `backend/tests/integration/saved-opportunities.test.ts` comprueba los cuatro tipos, sesiones independientes, colisiones de IDs, duplicados concurrentes, fechas y paginación mixta, registros antiguos, disponibilidad, permisos revocados, propiedad y fallos de DB. La suite frontend cubre contratos HTTP, identidad durante renovación/respuestas tardías, errores de red y cancelación de intenciones.

La revisión real de navegador utiliza `backend/tests/helpers/saved-browser.ts`, que exige `NODE_ENV=test` y una DB `_test` previamente migrada y sembrada. Ejecutarlo en un contenedor temporal, con variables de prueba, exponiendo `3001` en `localhost:3100`; mantener el frontend en `5173`. Iniciar Edge headless con perfil temporal y depuración local `9340`; ejecutar `node frontend/tests/browser/saved-opportunities.mjs`. El script comprueba Home/detalle, los cuatro tipos, teclado, páginas, vacantes cerradas, errores sin éxito ficticio, login/registro/cancelación, recarga, cambio de cuenta, otro contexto de navegador y actualización al recuperar foco. Captura escritorio y móvil a 390 y 320 píxeles en el directorio temporal del sistema. Terminar invocando `POST http://localhost:3100/__test/cleanup` y cerrar el navegador temporal. Estos endpoints auxiliares existen únicamente en ese proceso de prueba.

Validación de la entrega: **86 pruebas unitarias backend, 39 frontend y 125 de integración**, además de tipos, lint y compilación en ambos proyectos. Se verificó también una fila `SavedJobs` creada antes de la migración, preservando exactamente su ID y fecha. Los documentos y las cuentas del desarrollo no se utilizan como fixtures.
