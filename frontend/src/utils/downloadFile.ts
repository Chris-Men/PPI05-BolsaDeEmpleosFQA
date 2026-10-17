/** Starts a browser download and releases its temporary URL after the browser has consumed it. */
export function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.hidden = true;
  try { document.body.append(anchor); anchor.click(); }
  catch (failure: unknown) { URL.revokeObjectURL(url); throw failure; }
  finally { anchor.remove(); }
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
