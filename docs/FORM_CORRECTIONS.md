# Formularios, soporte y recuperación de vacantes

## Teléfonos y errores de campo

Perfil, postulación, teléfono institucional y WhatsApp comparten una máscara `+503 0000-0000`. Se aceptan ocho dígitos locales o el número completo con `503` o `+503`, incluyendo espacios y guiones. Letras, otros prefijos y dígitos adicionales se rechazan sin truncar. El prefijo visible no convierte un campo opcional vacío en un número.

Los perfiles y las postulaciones conservan ocho dígitos locales; Configuración guarda el teléfono institucional y WhatsApp como `+503 0000-0000`. La lectura no modifica registros históricos.

Los formularios administrativos y de cuenta muestran errores durante la edición, además de comprobarlos al salir del campo y antes de guardar. Los errores relacionados se recalculan con los valores nuevos, por ejemplo salarios, confirmación de contraseña y orden de fechas. Un intento de envío enfoca el primer control inválido; las etiquetas y descripciones de error están asociadas al campo. Las comprobaciones de permisos, existencia, unicidad y concurrencia siguen siendo definitivas en la API.

El perfil admite información incompleta y envía solo propiedades modificadas. Los borradores de postulación conservan el autoguardado de datos incompletos; los requisitos por paso y envío son independientes de la persistencia del borrador.

## Cantidades y cierre

- Salarios opcionales: mayores que cero y hasta 1000000 USD, con máximo dos decimales. Si ambos existen, el máximo debe ser mayor o igual al mínimo. Un PATCH parcial se compara con el otro extremo almacenado.
- Cupos opcionales: enteros entre 1 y 1000000. Horas sociales conservan el límite de 1 a 10000.
- Los controles numéricos rechazan letras, exponentes y signos. Tokens transitorios como `0.` permiten escribir `0.25`; cero no se puede guardar como cantidad válida.
- `expiresAt` recibe `YYYY-MM-DD`, real y desde hoy según `America/El_Salvador`. Se persiste al final del día salvadoreño (`23:59:59.999-06:00`) y se devuelve como instante ISO. El editor convierte ese instante al calendario salvadoreño.
- Las fechas históricas se pueden consultar. Los filtros de estadísticas y postulaciones mantienen su validador de fechas reales independiente del límite de cierre.

## Correo de soporte

El contrato público y administrativo de configuración incorpora `contacto.correoSoporte`, cadena con correo válido o `""`. Se utiliza en las secciones Ayuda de candidatos y administración. El correo general `contacto.correo` continúa siendo independiente.

Al leer un documento antiguo sin `correoSoporte`, se obtiene su correo general como valor inicial, sin escribir ni cambiar la versión. Una propiedad explícita vacía permanece vacía y oculta el contacto de correo en Ayuda. El siguiente guardado completo persiste la propiedad nueva. Los valores iniciales de ambos correos son `proyectos@fundaqa.org`.

Permanecen el control de versiones, la auditoría y la frontera de permisos: Administrador consulta; Super Admin modifica. El almacenamiento continúa en `SystemSettings`, sin migración de esquema.

## Recuperación de vacantes

`POST /api/admin/opportunities/:key/unarchive` devuelve `200` con el contrato habitual de oportunidad. Exige sesión, rol administrativo y permiso vigente `opportunities.archive`. El cliente envía únicamente la clave de la ruta.

La recuperación es transaccional: limpia `archivedAt`, recupera como Borrador si `publishedAt` es nulo y como Cerrada si ya hubo publicación. Conserva la primera publicación, IDs, postulaciones, inscripciones y relaciones. No publica inmediatamente ni cambia los contadores históricos. La publicación posterior conserva sus validaciones habituales.

Repetir la solicitud sobre una vacante ya recuperada devuelve su estado actual y no duplica auditoría. La primera recuperación registra `UNARCHIVE` con antes y después. Una clave inexistente devuelve `404`; errores de autenticación o permisos mantienen `401`/`403`.

## Verificación

Pruebas unitarias en ambos proyectos cubren formatos, normalización, precisión, límites, fechas y compatibilidad del correo. Integración usa una base exclusiva terminada en `_test`, nunca la base de desarrollo, e incluye permisos, PATCH parciales, recuperación idempotente de los cuatro tipos y conservación de la primera publicación.

Para aceptación real, iniciar el helper protegido `backend/tests/helpers/statistics-browser.ts` con su DB `_test` migrada y sembrada y publicarlo en localhost:3100. Mantener Vite en 5173 y Edge temporal con depuración local 9342. Ejecutar `node frontend/tests/browser/form-corrections.mjs`: verifica errores sin enviar, corrección inmediata, máscara, soporte persistente, recuperación, borradores, teclado y anchos 1440/390/320. Capturas en el directorio temporal `fqa-form-corrections-browser`. Al finalizar, llamar `POST /__test/cleanup`, cerrar el navegador temporal y retirar la base de pruebas.

El ajuste posterior de [contactos separados de vacantes](VACANCY_MANAGEMENT.md) incorpora la migración aditiva `20261025141230_opportunity_contact_fields` y exige título más al menos un medio de contacto válido al guardar borradores. No añade dependencias.
