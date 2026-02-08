import { WebContainer } from '@webcontainer/api';

/**
 * Singleton WebContainer instance management.
 * We use window to persist across HMR and multiple module evaluations.
 */
let bootLock = false;

export async function getWebContainer() {
  if (window.__WEBCONTAINER_INSTANCE__) {
    return window.__WEBCONTAINER_INSTANCE__;
  }

  if (window.__WEBCONTAINER_PROMISE__) {
    return window.__WEBCONTAINER_PROMISE__;
  }

  if (bootLock) {
    // Wait for the other process to finish and set the promise
    while (bootLock && !window.__WEBCONTAINER_PROMISE__) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (window.__WEBCONTAINER_PROMISE__) return window.__WEBCONTAINER_PROMISE__;
  }

  bootLock = true;
  console.log("ONYX: Initializing WebContainer boot sequence...");

  window.__WEBCONTAINER_PROMISE__ = (async () => {
    try {
      if (!window.crossOriginIsolated) {
        console.warn("ONYX: Environment is NOT cross-origin isolated. Attempting boot anyway...");
      }

      const instance = await WebContainer.boot();
      window.__WEBCONTAINER_INSTANCE__ = instance;
      console.log("ONYX: WebContainer booted successfully.");
      return instance;
    } catch (err) {
      const isAlreadyBooted = err.message.includes('Unable to create more instances') ||
                             err.message.includes('Only a single WebContainer instance can be booted');

      if (isAlreadyBooted) {
        console.warn("ONYX: WebContainer already booted according to error message.");
        if (window.__WEBCONTAINER_INSTANCE__) return window.__WEBCONTAINER_INSTANCE__;
        // If we still don't have it, we are in a broken state.
        // We'll throw a friendly error but keep the promise so we don't spam boot().
        throw new Error("WebContainer is already running in another part of the application. Please refresh to sync.");
      }

      if (err.message.includes('postMessage') && err.message.includes('SharedArrayBuffer')) {
        // This is expected if headers are removed
        throw new Error("Onyx Environment Warning: WebContainers require cross-origin isolation (COOP/COEP) to run. These headers are currently disabled, which may prevent the workspace from initializing correctly.");
      }

      window.__WEBCONTAINER_PROMISE__ = null;
      throw err;
    } finally {
      bootLock = false;
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
