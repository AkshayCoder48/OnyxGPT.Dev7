import { WebContainer } from '@webcontainer/api';

/**
 * Singleton WebContainer instance management.
 * We use window to persist across HMR and multiple module evaluations.
 */
export async function getWebContainer() {
  if (window.__WEBCONTAINER_INSTANCE__) {
    return window.__WEBCONTAINER_INSTANCE__;
  }

  if (window.__WEBCONTAINER_PROMISE__) {
    try {
      const instance = await window.__WEBCONTAINER_PROMISE__;
      window.__WEBCONTAINER_INSTANCE__ = instance;
      return instance;
    } catch (e) {
      // If the existing promise failed, and it's not a "already booted" error,
      // we should probably allow a fresh boot attempt.
      if (!e.message.includes('SharedArrayBuffer') && !e.message.includes('instances')) {
        window.__WEBCONTAINER_PROMISE__ = null;
      } else {
        throw e;
      }
    }
  }

  console.log("ONYX: Initializing WebContainer boot sequence...");

  if (!window.crossOriginIsolated) {
    console.warn("ONYX: Environment is NOT cross-origin isolated. WebContainer might fail.");
  }

  window.__WEBCONTAINER_PROMISE__ = (async () => {
    try {
      const instance = await WebContainer.boot();
      window.__WEBCONTAINER_INSTANCE__ = instance;
      console.log("ONYX: WebContainer booted successfully.");
      return instance;
    } catch (err) {
      const isAlreadyBooted = err.message.includes('Unable to create more instances') ||
                             err.message.includes('Only a single WebContainer instance can be booted');

      if (isAlreadyBooted) {
        console.warn("ONYX: WebContainer already booted elsewhere.");
        // If we get this error but don't have the instance, we are in an inconsistent state.
        // We throw a clear message to the user.
        throw new Error("WebContainer instance already exists. This can happen if the page was refreshed. Please try a hard refresh (Ctrl+F5) to reset the environment.");
      }

      if (err.message.includes('postMessage') && err.message.includes('SharedArrayBuffer')) {
        throw new Error("Security Error: Cross-Origin Isolation (COOP/COEP) headers are missing. The server must be configured to allow SharedArrayBuffer.");
      }

      window.__WEBCONTAINER_PROMISE__ = null;
      throw err;
    }
  })();

  return window.__WEBCONTAINER_PROMISE__;
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
