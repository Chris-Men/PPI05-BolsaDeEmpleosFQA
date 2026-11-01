import { Fragment } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import App from '../App';
import { NavigationProvider } from '../state/NavigationProvider';
import { routeDefinitions } from '../utils/routes';
import { captureResetCredential } from '../utils/resetCredential';

captureResetCredential();

/** Route objects keep the application shell and global providers mounted across history changes. */
const router = createBrowserRouter([{
  element: <NavigationProvider><App /></NavigationProvider>,
  errorElement: <main className="session-status"><h1>No fue posible mostrar esta página</h1><p>Inténtalo nuevamente o vuelve al inicio.</p><button type="button" onClick={() => window.location.reload()}>Reintentar</button><a href="/">Ir al inicio</a></main>,
  children: [...new Set([...routeDefinitions.map(item => item.path), '/estudiantes', '*'])].map(path => ({ path, element: <Fragment /> })),
}]);

/** Only one browser router owns the native history and its navigation metadata. */
export function AppRoutes() { return <RouterProvider router={router} />; }
