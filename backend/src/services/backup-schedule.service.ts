/** Salvador has no DST; the IANA zone still defines the calendar independently of container TZ. */
export const backupLocalDate = (now: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

/** Most recently due daily slot, expressed as a Salvador calendar date. */
export const backupScheduledSlot = (now: Date): string => {
  const date = backupLocalDate(now); const due = new Date(date + 'T02:00:00-06:00');
  return now >= due ? date : backupLocalDate(new Date(now.getTime() - 24 * 60 * 60_000));
};

/** Next wall-clock 02:00, including when the process runs in UTC. */
export const nextBackupAt = (now = new Date()): string => {
  const due = new Date(backupLocalDate(now) + 'T02:00:00-06:00');
  return new Date(due.getTime() + (now >= due ? 24 * 60 * 60_000 : 0)).toISOString();
};
