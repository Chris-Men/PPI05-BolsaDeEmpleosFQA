import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** A reusable browser harness uses a dedicated temporary Edge/Chromium debugging profile. */
export async function browserHarness(output, debugging = 'http://127.0.0.1:9342') {
  await mkdir(output, { recursive: true });
  const target = await (await fetch(debugging + '/json/new?about:blank', { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0; const pending = new Map(); const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (message.error) task?.reject(new Error(message.error.message)); else task?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; };
  const wait = async (expression, label = expression, timeout = 25000) => { const until = Date.now() + timeout; while (Date.now() < until) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error('Tiempo agotado: ' + label); };
  const navigate = async url => { await send('Page.navigate', { url }); await wait(`document.readyState==='complete'&&Boolean(document.querySelector('#root')?.children.length)`, 'navegación'); };
  const click = label => evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(element=>(element.textContent.trim()===${JSON.stringify(label)}||element.getAttribute('aria-label')===${JSON.stringify(label)})&&!element.disabled);if(!button)throw Error('Botón no disponible: '+${JSON.stringify(label)});button.click();})()`);
  const fill = (selector, value) => evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});const prototype=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event(element instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`);
  const screenshot = async name => { const capture = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(output, name + '.png'), Buffer.from(capture.data, 'base64')); };
  const width = async () => { const size = await evaluate(`({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})`); assert.ok(size.content <= size.viewport + 1, JSON.stringify(size)); };
  const close = async () => { socket.close(); await fetch(debugging + '/json/close/' + target.id); };
  await send('Page.enable'); await send('Runtime.enable');
  return { send, evaluate, wait, navigate, click, fill, screenshot, width, close, errors };
}
