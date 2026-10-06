# Correo y recuperación de contraseña

El backend entrega mensajes por SMTP. En desarrollo, Mailpit captura los correos en `http://localhost:8025`; no los envía a Internet. En producción se configura un proveedor SMTP externo. El trabajador de correo se ejecuta dentro del proceso del backend y usa PostgreSQL para conservar mensajes pendientes y reintentar errores temporales. Una entrega aceptada por SMTP puede repetirse si el proceso se detiene antes de marcarla como enviada.

## Configuración

Configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `RESET_PASSWORD_URL` y `MAIL_OUTBOX_KEY`. Si el proveedor exige autenticación, configura `SMTP_USER` y `SMTP_PASS` juntos. En producción, `RESET_PASSWORD_URL` debe ser HTTPS y el transporte exige TLS mediante SMTPS o STARTTLS. `MAIL_OUTBOX_KEY` debe contener 64 caracteres hexadecimales aleatorios (32 bytes). Genera una clave distinta por entorno:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
```

Guarda la clave fuera de Git y conserva su valor mientras haya mensajes pendientes: cambiarla impide descifrarlos. Las plantillas `.env.example` indican dónde colocarla.

En Docker Compose de desarrollo, `SMTP_HOST` apunta al servicio Mailpit y `SMTP_PORT` es `1025`. Si ejecutas Node directamente, usa `SMTP_HOST=localhost`. La interfaz de Mailpit está en `http://localhost:8025`. En producción, configura un SMTP real; el archivo Compose de producción no incluye Mailpit.

## API de recuperación

Las dos rutas públicas requieren `Content-Type: application/json` y `X-FQA-Request: 1`, además de un `Origin` permitido si el cliente lo envía.

- `POST /api/auth/forgot-password` recibe `{ "email": "ana@example.com" }`. Devuelve siempre `202` y el mismo mensaje para cuentas activas, inexistentes, deshabilitadas, eliminadas o dentro del límite. Para una cuenta activa, encola un enlace como máximo una vez cada cinco minutos, incluso si el anterior ya se usó.
- `POST /api/auth/reset-password` recibe `{ "token": "<token del enlace>", "password": "Nueva contraseña segura" }`. Devuelve `200` con un mensaje de confirmación. Un token ausente devuelve `400` de validación; uno inválido, vencido o consumido devuelve `400` con un mensaje genérico.

El enlace apunta a `RESET_PASSWORD_URL` y agrega el token como parámetro `token`. La pantalla `/reset-password` pide y confirma la nueva contraseña, llama al endpoint, elimina el token de la barra de direcciones al abrirse y vuelve al login. El frontend usa una política de referencias `no-referrer`. La pantalla `/forgot-password` solicita el correo desde el enlace del inicio de sesión.

Cada enlace dura 30 minutos, se usa una sola vez y solo se guarda su hash SHA-256 en la tabla de recuperación. El cuerpo del correo pendiente está cifrado con AES-256-GCM. La actualización de contraseña, el consumo del enlace y la revocación de todas las sesiones anteriores se confirman en una misma transacción. No se crea una sesión nueva; la pantalla vuelve al login. Se encola un aviso de cambio. Los fallos SMTP se registran sin contenido ni credenciales y se reintentan hasta ocho veces; los enlaces vencidos se descartan. Los mensajes enviados o descartados se eliminan de la cola después de 30 días.

## Correos de postulaciones

Los servicios `enqueueApplicationConfirmation` y `enqueueApplicationDecision` preparan mensajes para el candidato dentro de la transacción que guardará la postulación o decisión. El llamador debe proporcionar una `eventKey` estable y única por evento para evitar duplicados. Hay textos de confirmación para empleo, voluntariado, horas sociales y prácticas, y textos de aprobación o rechazo para futuras postulaciones con estado.

Actualmente no hay APIs de postulaciones en el backend, así que estas funciones no tienen disparadores reales. Los registros de voluntariado no tienen estado individual y solo podrán generar confirmación hasta que se modele su decisión.

## Reconciliación de una base creada por la rama anterior

Una base que aplicó `20260929063215_email_password_recovery` usa otra estructura de `password_reset_tokens` y ya tiene `email_outbox`. No ejecutes `prisma migrate deploy` directamente sobre esa base: las migraciones de esta rama intentarían crear tablas existentes.

Con el backend detenido, haz primero un respaldo completo con `pg_dump -Fc`. Ejecuta `backend/scripts/reconcile-legacy-password-reset.sql` con `psql -v ON_ERROR_STOP=1`; renombra las columnas existentes y agrega la clave `id` sin borrar tokens ni mensajes. Luego, desde `backend/`, registra las estructuras equivalentes con:

```bash
npx prisma migrate resolve --applied 20260929193125_add_password_reset_tokens
npx prisma migrate resolve --applied 20261001083439_email_outbox
```

Finalmente, ejecuta `backend/scripts/retire-legacy-email-migration.sql` con `psql -v ON_ERROR_STOP=1` y confirma con `npx prisma migrate status` y `npx prisma migrate deploy`. El segundo script retira del historial activo solo la entrada combinada anterior y exige que ambas migraciones nuevas estén registradas. Conserva el respaldo hasta completar la verificación.
