/** Known query fields are normalized independently, preserving unrelated routing intents. */
export interface QueryRule {
  param?: string; type?: 'integer' | 'number' | 'boolean' | 'date'; min?: number; max?: number;
  choices?: readonly string[]; maxLength?: number; pattern?: string; persistDefault?: boolean;
}
export type QueryRules<T> = Partial<Record<keyof T, QueryRule>>;

/** Existing DTO defaults determine types unless an optional field has an explicit rule. */
export function readRouteQuery<T extends object>(query: URLSearchParams, defaults: T, rules: QueryRules<T> = {}): T {
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const rule = rules[key] ?? {}; const raw = query.get(rule.param ?? key);
    if (raw === null || raw === '') continue;
    const fallback = defaults[key]; let value: unknown = raw;
    if (rule.type === 'boolean' || typeof fallback === 'boolean') value = raw === 'true' ? true : raw === 'false' ? false : fallback;
    else if (rule.type === 'integer' || rule.type === 'number' || typeof fallback === 'number') {
      const number = Number(raw);
      value = Number.isFinite(number) && (rule.type === 'number' || Number.isInteger(number)) && number >= (rule.min ?? 1) && number <= (rule.max ?? 2147483647) ? number : fallback;
    } else if (rule.type === 'date') {
      const parsed = new Date(raw + 'T00:00:00Z');
      value = /^\d{4}-\d{2}-\d{2}$/.test(raw) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw ? raw : fallback;
    } else value = raw.trim().slice(0, rule.maxLength ?? 255);
    if (rule.choices && !rule.choices.includes(String(value))) value = fallback;
    if (rule.pattern && !new RegExp(rule.pattern).test(String(value))) value = fallback;
    result[key] = value as T[keyof T & string];
  }
  return result;
}

/** Only primitive filter values enter the address bar; default values are omitted. */
export function writeRouteQuery<T extends object>(query: URLSearchParams, value: T, defaults: T, rules: QueryRules<T> = {}): URLSearchParams {
  const next = new URLSearchParams(query);
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const name = rules[key]?.param ?? key; const field = value[key];
    if (field === undefined || field === null || field === '' || field === defaults[key] && !rules[key]?.persistDefault) next.delete(name);
    else if (['string', 'number', 'boolean'].includes(typeof field)) next.set(name, String(field));
  }
  return next;
}
