import { useContext } from 'react';
import { StatisticsExportsContext } from '../state/statisticsExportsContext';

/** Export UI always consumes the session-owned provider rather than starting a separate poller. */
export const useStatisticsExports = () => {
  const value = useContext(StatisticsExportsContext);
  if (!value) throw new Error('Se requiere el proveedor de exportaciones.'); return value;
};
