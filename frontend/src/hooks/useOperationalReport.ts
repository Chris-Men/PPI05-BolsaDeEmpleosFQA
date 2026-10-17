import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { getAdministrativeStatistics } from '../services/statisticsService';
import { ApiError } from '../services/api';
import { sessionStore } from '../services/sessionStore';
import { canReadStatistics } from '../utils/siteManagement';
import { downloadFile } from '../utils/downloadFile';
import type { StatisticsRange } from '../types/statistics';
import logo from '../components/imagenes/logo/logo 2.png';

/** A missing static logo falls back to a text brand without preventing an authorized report. */
async function reportLogo(): Promise<string | undefined> {
  try {
    const image = new Image(); image.src = logo; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); if (!context) return undefined;
    context.drawImage(image, 0, 0); return canvas.toDataURL('image/png');
  } catch { return undefined; }
}

/** Downloads only after a fresh authorized snapshot; late responses cannot export data from a former account or range. */
export function useOperationalReport(range: StatisticsRange) {
  const { session } = useAuth(); const userId = session?.userId ?? 0; const allowed = canReadStatistics(session);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const pending = useRef<AbortController | null>(null);
  const { from, to } = range;
  useEffect(() => {
    setBusy(false); setError(''); setNotice('');
    return () => { pending.current?.abort(); pending.current = null; };
  }, [userId, allowed, from, to]);
  /** A ref prevents duplicate exports even before React renders the disabled button. */
  const download = async (): Promise<void> => {
    if (!allowed || pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    const currentIdentity = (): boolean => {
      const current = sessionStore.getSnapshot().session;
      return !controller.signal.aborted && current?.userId === userId && canReadStatistics(current);
    };
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await getAdministrativeStatistics({ from, to }, userId, controller.signal);
      if (controller.signal.aborted) return;
      const [{ createOperationalReport }, logoDataUrl] = await Promise.all([import('../utils/statisticsReportPdf'), reportLogo()]);
      if (!currentIdentity()) return;
      const report = createOperationalReport(data, { generatedAt: new Date(), logoDataUrl });
      if (!currentIdentity()) return;
      downloadFile(report.blob, report.fileName); setNotice('Descarga del reporte iniciada.');
    } catch (failure: unknown) {
      if (!controller.signal.aborted) setError(failure instanceof ApiError ? failure.message : 'No se pudo generar el reporte. Inténtalo nuevamente.');
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return { busy, error, notice, download };
}
