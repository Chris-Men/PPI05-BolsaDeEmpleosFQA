import { useEffect,useState,useCallback } from 'react';
import { listApplications,getApplicationStatistics,getNotifications } from '../services/applicationService';
import type { Application,ApplicationFilters,ApplicationStatistics,NotificationPage } from '../types/application';
import type { Page } from '../types/opportunity';
/** Requests are scoped to their filter identity; late responses cannot overwrite another page. */
export function useApplications(filters:ApplicationFilters={},admin=false,enabled=true) {
  const [page,setPage]=useState<Page<Application>>({items:[],total:0,page:1,pageSize:20});
  const [loading,setLoading]=useState(enabled);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(value=>value+1),[]);
  const identity=JSON.stringify(filters);
  useEffect(()=>{if(!enabled)return;let current=true;setLoading(true);setError('');
    void listApplications(JSON.parse(identity) as ApplicationFilters,admin).then(value=>{if(current)setPage(value);}).catch((failure:unknown)=>{if(current)setError(failure instanceof Error?failure.message:'No se pudieron cargar las postulaciones.');}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[identity,admin,revision,enabled]);
  useEffect(()=>{if(!enabled)return;const refresh=()=>{if(!document.hidden)reload();};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[enabled,reload]);
  return {page,loading,error,reload};
}
/** Server aggregates are independent of the paginated visible list. */
export function useApplicationStatistics(enabled=true,filters:ApplicationFilters={}) {
  const [statistics,setStatistics]=useState<ApplicationStatistics|null>(null);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(value=>value+1),[]);
  const identity=JSON.stringify(filters);
  useEffect(()=>{if(!enabled)return;let current=true;setError('');void getApplicationStatistics(JSON.parse(identity) as ApplicationFilters).then(value=>{if(current)setStatistics(value);}).catch((failure:unknown)=>{if(current)setError(failure instanceof Error?failure.message:'No se pudieron cargar los indicadores.');});return()=>{current=false;};},[enabled,revision,identity]);
  useEffect(()=>{if(!enabled)return;const refresh=()=>{if(!document.hidden)reload();};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[enabled,reload]);
  return {statistics,error,reload};
}
/** Notification state is mounted inside the account-scoped candidate profile. */
export function useNotifications(enabled=true,page=1) {
  const [result,setResult]=useState<NotificationPage>({items:[],total:0,unreadCount:0,page:1,pageSize:20});
  const [error,setError]=useState('');const [loading,setLoading]=useState(enabled);const [revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(value=>value+1),[]);
  useEffect(()=>{if(!enabled)return;let current=true;setLoading(true);setError('');void getNotifications(page).then(value=>{if(current)setResult(value);}).catch((failure:unknown)=>{if(current)setError(failure instanceof Error?failure.message:'No se pudieron cargar las notificaciones.');}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[enabled,page,revision]);
  useEffect(()=>{if(!enabled)return;const refresh=()=>{if(!document.hidden)reload();};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[enabled,reload]);
  return {result,error,loading,reload};
}
