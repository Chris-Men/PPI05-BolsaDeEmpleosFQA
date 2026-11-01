# Navegación por URL

El frontend utiliza `react-router` **8.5.1**, en modo Data con `createBrowserRouter` y `RouterProvider`, sin SSR. La dependencia gestiona el historial del navegador y el bloqueo de navegación con cambios pendientes. La entrada está en `frontend/src/routes/AppRoutes.tsx`; la tabla compartida de destinos y validadores está en `frontend/src/utils/routes.ts`. Se conserva el diseño de las pantallas existentes. Véase la [instalación oficial](https://reactrouter.com/start/data/installation).

## Rutas

| Área | Direcciones |
| --- | --- |
| Públicas | `/`, `/empleos`, `/voluntariado`, `/estudiantes/horas-sociales`, `/estudiantes/practicas`, `/nosotros`, `/ayuda`, `/colaboradores` |
| Detalles públicos | `/:opportunityKey` al final de cada listado; empleos conserva su página y los otros tipos su diálogo |
| Autenticación | `/login`, `/registro`, `/forgot-password`, `/reset-password` |
| Perfil | `/perfil`, `/perfil/datos-personales`, `/perfil/postulaciones`, `/perfil/notificaciones`, `/perfil/configuracion` |
| Postular y confirmar | `/postular/:opportunityKey`, `/postulaciones/:id/confirmacion` |
| Detalles de postulación | `/perfil/postulaciones/:id`, `/perfil/notificaciones/postulaciones/:id`, `/admin/postulaciones/:id` |
| Panel | `/admin`, `/admin/vacantes`, `/admin/postulaciones`, `/admin/organizaciones`, `/admin/categorias`, `/admin/estadisticas`, `/admin/usuarios`, `/admin/configuracion`, `/admin/respaldos`, `/admin/ayuda` |
| Vacantes administrativas | `/admin/vacantes/nueva`, `/admin/vacantes/:opportunityKey`, `/admin/vacantes/:opportunityKey/editar` |
| Consulta de organización | `/admin/organizaciones/:id` |

`opportunityKey` conserva el identificador de API (`job-123` o `volunteer-123`). Los detalles se consultan por identificador y pueden abrirse directamente o recargarse. `/estudiantes` redirige por reemplazo a horas sociales. Una dirección desconocida muestra «Página no encontrada».

## Historial y estado

Los filtros y la paginación utilizan los nombres de los DTO: `search`, `location`, `modality`, `categoryId`, `salaryMax`, `kind`, `status`, `state`, `role`, `deleted`, `organizationId`, `candidateId`, `opportunityKey`, `from`, `to`, `page` y `pageSize`, según el listado. El resumen del perfil usa `summary`; guardadas y borradores mantienen `savedPage` y `draftPage` independientes. Las categorías del informe usan `categoryPage`. Solo las fechas aplicadas de estadísticas se escriben en la URL; los calendarios todavía sin aplicar permanecen en memoria.

Cambiar de sección, filtro seleccionado, página o detalle crea una entrada. Los buscadores reemplazan la entrada tras 300 ms y reinician la página. Los valores inválidos, predeterminados o páginas fuera de rango se corrigen mediante reemplazo. Volver restaura consulta y desplazamiento; cerrar un detalle abierto desde la aplicación utiliza su historial. En acceso directo, cerrar lleva al listado correspondiente. Los diálogos contienen el foco y lo devuelven al control de origen cuando sigue disponible.

Los proveedores de sesión, configuración pública, exportaciones y los monitores globales permanecen montados al cambiar de ruta. Los datos privados de una cuenta se descartan al cambiar de identidad.

## Acceso y cambios pendientes

Las rutas privadas esperan la restauración de sesión. El visitante llega a `/login?returnTo=...`; el acceso correcto reemplaza login por un destino interno seguro. Los controles de rol y permisos de cada módulo siguen vigentes y el backend conserva la autorización definitiva.

Administrador y Super Admin pueden recorrer las páginas públicas, acceder a **Mi perfil** y volver al **Panel administrativo**. Su perfil muestra nombre, correo y rol, con contraseña y cierre de sesiones en **Cuenta y seguridad**. No monta el perfil profesional ni consulta datos de candidato. Las acciones de guardar y postular se ocultan y `/postular` bloquea estas cuentas antes de crear borradores.

Un coordinador común protege la navegación interna y atrás/adelante. La postulación guarda los cambios del borrador antes de salir; un fallo mantiene el formulario y explica el motivo. Una operación de CV o envío activa bloquea la salida. Los pasos del formulario son locales y no crean historial. El envío correcto reemplaza el formulario por la confirmación, que consulta el intento existente al recargarse.

Los demás editores con cambios muestran **Seguir editando** o **Descartar cambios y salir**, también al cerrar su diálogo. Usuarios, categorías y altas/ediciones de organizaciones continúan siendo modales locales. `beforeunload` solicita confirmación para recarga, cierre de pestaña o salida del sitio; no realiza ni garantiza guardados asíncronos durante esas acciones.

## Compatibilidad y operación

Se conservan los enlaces antiguos `?postular=`, `?postulacion=` y `?guardar=`; se convierten a destinos del router y cada intención se consume una sola vez. El token recibido en `/reset-password?token=...` se retira antes de construir el router y queda solo en memoria. Recargar después de retirarlo requiere volver a abrir el enlace original. No se guardan contraseñas, credenciales ni contenido de formularios en URL o estado del historial.

`frontend/Caddyfile` ya sirve rutas profundas mediante `try_files {path} /index.html`. La implementación no requiere cambios de API, Prisma, migraciones ni Docker. En desarrollo, después de actualizar dependencias, ejecutar la instalación del frontend o reconstruir su contenedor según `docs/SETUP.md`.

## Validación reproducible

```bash
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```

`frontend/tests/routes.test.mjs` cubre resolución, identificadores, consultas, normalización, retornos seguros, roles y enlaces antiguos. `frontend/tests/browser/navigation.mjs` utiliza el historial real de Edge/Chromium con una API determinista interceptada en un perfil de navegador de pruebas; no usa cuentas ni bases reales. Iniciar Vite en `5174`, Edge/Chromium con un perfil temporal y depuración remota en `9344`, y ejecutar:

```bash
node frontend/tests/browser/navigation.mjs
```

Se pueden cambiar las direcciones con `NAVIGATION_WEB_URL` y `NAVIGATION_CDP_URL`. Las capturas se guardan en el directorio temporal `fqa-navigation-browser`. Las comprobaciones del backend pueden ejecutarse dentro del contenedor de desarrollo, que incluye el cliente Prisma generado y el sistema de archivos Linux utilizado en producción.
