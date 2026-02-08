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
      return await window.__WEBCONTAINER_PROMISE__;
    } catch (e) {
      window.__WEBCONTAINER_PROMISE__ = null;
    }
  }

  console.log("ONYX: Initializing WebContainer boot sequence...");

  if (!window.crossOriginIsolated) {
    console.error("ONYX: Environment is NOT cross-origin isolated. WebContainer will fail.");
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
        console.warn("ONYX: WebContainer already booted (instance exists but not captured).");
        throw new Error("WebContainer is already running in another tab or was not properly closed. Please close other tabs or use the 'Restart' option.");
      }

      if ((err.message.includes('postMessage') && err.message.includes('SharedArrayBuffer')) || !window.crossOriginIsolated) {
        throw new Error("Security Error: Cross-Origin Isolation (COOP/COEP) is missing. WebContainer requires these headers to be set on the server.");
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

/**
 * Tears down the current WebContainer instance and clears global references.
 */
export async function teardown() {
  console.log("ONYX: Tearing down WebContainer...");
  if (window.__WEBCONTAINER_INSTANCE__) {
    try {
      const wc = window.__WEBCONTAINER_INSTANCE__;
      if (wc && typeof wc.teardown === 'function') {
        await wc.teardown();
      }
    } catch (err) {
      console.error("ONYX: Error during WebContainer teardown:", err);
    }
  }
  window.__WEBCONTAINER_INSTANCE__ = null;
  window.__WEBCONTAINER_PROMISE__ = null;
  console.log("ONYX: WebContainer reference cleared.");
}

/**
 * Restarts the WebContainer by tearing down the current instance and booting a new one.
 */
export async function restartWebContainer() {
  await teardown();
  return await getWebContainer();
}
