# FQA Empleos — Bolsa de Trabajo Social (Versión Modular)

Este proyecto ha sido completamente modularizado. Cada pantalla del sistema se encuentra en su propio archivo independiente dentro de la carpeta `src/screens/`.

## Estructura de Archivos Creada:
- `src/App.jsx`: Enrutador principal y administrador global del estado (vacantes, sesiones, postulaciones).
- `src/index.css`: Estilos visuales ordenados de la aplicación.
- `src/screens/Home.jsx`: Pantalla de inicio con estadísticas, buscador y ofertas destacadas.
- `src/screens/JobsListing.jsx`: Listado completo de vacantes con panel de filtros y buscador avanzado.
- `src/screens/JobDetail.jsx`: Vista en detalle del rol, barra de compatibilidad y resumen del puesto.
- `src/screens/FormFlow.jsx`: Formulario de postulación multi-paso interactivo.
- `src/screens/Confirmation.jsx`: Confirmación de envío con línea de tiempo y referencia.
- `src/screens/Volunteers.jsx`: Bolsa de voluntariado activa, cupos disponibles e información institucional.
- `src/screens/Nosotros.jsx`: Información oficial de la Fundación Quintanilla Amaya (misión y albergues).
- `src/screens/CandidateProfile.jsx`: Panel de control privado del candidato (gestión de CV y postulaciones).
- `src/screens/AdminDashboard.jsx`: Panel privado de administración (crear/eliminar vacantes, aprobar/denegar perfiles).

## Instrucciones para Ejecutar en VS Code:

1. Descomprime el archivo ZIP.
2. Abre la carpeta del proyecto en VS Code: `cd fqa-bolsa-trabajo-modular`
3. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
4. Ejecuta el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
5. Abre el navegador en `http://localhost:3000`.
