import type { StatisticsRange } from '../types/statistics';

/** Date controls use the site's calendar rather than the browser's timezone. */
export const siteToday = (now = new Date()): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export type StatisticsPreset = '30' | '90' | 'year' | 'custom';
/** Calendar arithmetic at UTC noon avoids host timezone and DST shifts. */
export const statisticsPresetRange = (preset: Exclude<StatisticsPreset, 'custom'>, now = new Date()): StatisticsRange => {
  const to = siteToday(now);
  const start = new Date(to + 'T12:00:00Z');
  if (preset === 'year') return { from: to.slice(0, 4) + '-01-01', to };
  start.setUTCDate(start.getUTCDate() - (Number(preset) - 1));
  return { from: start.toISOString().slice(0, 10), to };
};
/** Invalid or incomplete inputs never dispatch a statistics request. */
export const statisticsRangeError = ({ from, to }: StatisticsRange): string => {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) > 0 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return !valid(from) || !valid(to) ? 'Selecciona dos fechas válidas.' : from > to ? 'La fecha final debe ser igual o posterior a la inicial.' : '';
};
