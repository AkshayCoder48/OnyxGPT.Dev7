import { WebContainer } from '@webcontainer/api';

/**
 * Singleton WebContainer instance management.
 */
export async function getWebContainer() {
  if (window.__WEBCONTAINER_INSTANCE__) {
    return window.__WEBCONTAINER_INSTANCE__;
  }

  if (window.__WEBCONTAINER_PROMISE__) {
    try {
      return await window.__WEBCONTAINER_PROMISE__;
    } catch {
      window.__WEBCONTAINER_PROMISE__ = null;
    }
  }

  window.__WEBCONTAINER_PROMISE__ = (async () => {
    try {
      const instance = await WebContainer.boot();
      window.__WEBCONTAINER_INSTANCE__ = instance;
      return instance;
    } catch (err) {
      window.__WEBCONTAINER_PROMISE__ = null;
      throw err;
    }
  })();

  return window.__WEBCONTAINER_PROMISE__;
}

export function isWebContainerBooted() {
  return !!window.__WEBCONTAINER_INSTANCE__;
}

export async function writeFile(path, contents) {
  const wc = await getWebContainer();
  await wc.fs.writeFile(path, contents);
}

export async function readFile(path) {
  const wc = await getWebContainer();
  return await wc.fs.readFile(path, 'utf-8');
}

export async function runCommand(command, args, onData) {
  const wc = await getWebContainer();
  const process = await wc.spawn(command, args);

  const decoder = new TextDecoder();
  process.output.pipeTo(new WritableStream({
    write(data) {
      const decoded = typeof data === 'string' ? data : decoder.decode(data);
      if (onData) onData(decoded);
    }
  }));

  return process.exit;
}

export async function listFiles(path = '/') {
  const wc = await getWebContainer();
  return await wc.fs.readdir(path);
}

export async function mount(files) {
  const wc = await getWebContainer();
  await wc.mount(files);
}

export async function teardown() {
  if (window.__WEBCONTAINER_INSTANCE__) {
    try {
      const wc = window.__WEBCONTAINER_INSTANCE__;
      if (wc && typeof wc.teardown === 'function') {
        await wc.teardown();
      }
    } catch { console.error("teardown failed"); }
  }
  window.__WEBCONTAINER_INSTANCE__ = null;
  window.__WEBCONTAINER_PROMISE__ = null;
}

export async function restartWebContainer() {
  await teardown();
  return await getWebContainer();
}
