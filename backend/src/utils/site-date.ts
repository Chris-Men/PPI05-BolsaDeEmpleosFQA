/** Salvadoran calendar dates are independent of the server's timezone. */
export const siteDate = (now = new Date()): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

/** El Salvador uses UTC-06:00 throughout the year. */
export const closingInstant = (value: string): Date => new Date(value + 'T23:59:59.999-06:00');
