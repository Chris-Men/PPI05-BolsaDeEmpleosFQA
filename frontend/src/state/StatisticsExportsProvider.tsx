import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { StatisticsExportsContext } from './statisticsExportsContext';
import type { StatisticsExport, StatisticsExportRequest } from '../types/statisticsExport';
import { listStatisticsExports, requestStatisticsExport, downloadStatisticsExport } from '../services/statisticsExportService';
import { sessionStore } from '../services/sessionStore';
import { canExportStatistics } from '../utils/siteManagement';
import { exportDownloadMarker, isStatisticsExportPending } from '../utils/statisticsExport';
import { downloadFile } from '../utils/downloadFile';

interface StatisticsExportsProviderProps { children: ReactNode }
/** Polling and downloads belong to one authenticated identity, independent of page navigation. */
export function StatisticsExportsProvider({ children }: StatisticsExportsProviderProps) {
  const { session } = useAuth(); const userId = session?.userId ?? 0; const allowed = canExportStatistics(session);
  const [jobs, setJobs] = useState<StatisticsExport[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [activeJob, setActiveJob] = useState<StatisticsExport | null>(null); const [pollError, setPollError] = useState('');
  const [requesting, setRequesting] = useState(false); const [downloading, setDownloading] = useState<number[]>([]);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [revision, setRevision] = useState(0);
  const controllers = useRef(new Set<AbortController>()); const requestPending = useRef(false); const downloads = useRef(new Set<number>()); const attempted = useRef(new Set<string>());
  const current = useCallback(() => { const value = sessionStore.getSnapshot().session; return value?.userId === userId && canExportStatistics(value); }, [userId]);
  useEffect(() => {
    const pending = controllers.current;
    setJobs([]); setActiveJob(null); setPollError(''); setTotal(0); setPage(1); setError(''); setNotice(''); setRequesting(false); setDownloading([]); requestPending.current = false; downloads.current.clear();
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith('fqa.statistics-export.' + userId + '.') && Number(localStorage.getItem(key)) <= Date.now()) localStorage.removeItem(key);
    } catch { /* Metadata cleanup is optional when browser storage is unavailable. */ }
    return () => { for (const controller of pending) controller.abort(); pending.clear(); };
  }, [userId, allowed]);
  /** Automatic markers are written before fetching; a failed attempt always leaves a manual retry. */
  const download = useCallback(async (job: StatisticsExport): Promise<void> => {
    if (!current() || downloads.current.has(job.id)) return;
    const controller = new AbortController(); controllers.current.add(controller); downloads.current.add(job.id); setDownloading(ids => [...ids, job.id]); setError('');
    const marker = exportDownloadMarker(userId, job.id, job.createdAt); attempted.current.add(marker);
    try { if (job.expiresAt) localStorage.setItem(marker, String(Date.parse(job.expiresAt))); } catch { /* The session guard also works without local storage. */ }
    try {
      const blob = await downloadStatisticsExport(job.id, userId, controller.signal);
      if (controller.signal.aborted || !current()) return;
      downloadFile(blob, job.fileName); setNotice('Descarga del Excel iniciada. Si el navegador la bloquea, usa Descargar.');
    } catch (failure: unknown) {
      if (!controller.signal.aborted && current()) setError(failure instanceof Error ? failure.message : 'No se pudo descargar el Excel. Usa Descargar para reintentar.');
    } finally {
      controllers.current.delete(controller);
      if (!controller.signal.aborted) { downloads.current.delete(job.id); setDownloading(ids => ids.filter(id => id !== job.id)); }
    }
  }, [current, userId]);
  useEffect(() => {
    if (!allowed) return;
    const pendingControllers = controllers.current;
    const controller = new AbortController(); pendingControllers.add(controller); let running = false;
    const poll = async (): Promise<void> => {
      if (running || controller.signal.aborted) return; running = true;
      try {
        const result = await listStatisticsExports(page, userId, controller.signal);
        if (!current() || controller.signal.aborted) return;
        setJobs(result.items); setTotal(result.total);
        const first = page === 1 ? result : await listStatisticsExports(1, userId, controller.signal);
        if (!current() || controller.signal.aborted) return;
        setPollError(''); setActiveJob(first.items.find(isStatisticsExportPending) ?? null);
        for (const job of first.items) {
          if (job.status !== 'READY' || !job.expiresAt || Date.parse(job.expiresAt) <= Date.now()) continue;
          const key = exportDownloadMarker(userId, job.id, job.createdAt);
          let marked = attempted.current.has(key);
          try { marked ||= Number(localStorage.getItem(key)) > Date.now(); } catch { /* In-memory guard still prevents repeated polling downloads. */ }
          if (marked) continue;
          attempted.current.add(key); try { localStorage.setItem(key, String(Date.parse(job.expiresAt))); } catch { /* Storage can be unavailable in private browsing. */ }
          void download(job);
        }
      } catch (failure: unknown) {
        if (!controller.signal.aborted && current()) setPollError(failure instanceof Error ? failure.message : 'No se pudo consultar la cola. Se reintentará automáticamente.');
      } finally { running = false; }
    };
    void poll(); const timer = window.setInterval(() => void poll(), 3000);
    return () => { clearInterval(timer); controller.abort(); pendingControllers.delete(controller); };
  }, [allowed, userId, page, revision, current, download]);
  /** A request UUID is retained by the confirmation dialog for safe retries after an uncertain HTTP result. */
  const request = async (payload: StatisticsExportRequest): Promise<boolean> => {
    if (!allowed || !current() || requestPending.current) return false;
    requestPending.current = true; setRequesting(true); setError(''); const controller = new AbortController(); controllers.current.add(controller);
    try {
      await requestStatisticsExport(payload, userId, controller.signal);
      if (controller.signal.aborted || !current()) return false;
      setPage(1); setRevision(value => value + 1); setNotice('Exportación en cola. La descarga comenzará cuando esté lista.'); return true;
    } catch (failure: unknown) {
      if (!controller.signal.aborted && current()) setError(failure instanceof Error ? failure.message : 'No se pudo encolar la exportación. Inténtalo nuevamente.'); return false;
    } finally {
      controllers.current.delete(controller);
      if (!controller.signal.aborted) { requestPending.current = false; setRequesting(false); }
    }
  };
  return <StatisticsExportsContext.Provider value={{ allowed, jobs, total, page, setPage, activeJob, requesting, downloading, error: error || pollError, notice, request, download,
    reload: () => { setError(''); setPollError(''); setRevision(value => value + 1); }, dismiss: () => { setError(''); setPollError(''); setNotice(''); } }}>{children}</StatisticsExportsContext.Provider>;
}
