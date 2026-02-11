import { WebContainer } from '@webcontainer/api';

/**
 * Singleton WebContainer instance management.
 * We use window to persist across HMR and multiple module evaluations.
 */
export async function getWebContainer() {
  if (window.__WEBCONTAINER_INSTANCE__) {
    return window.__WEBCONTAINER_INSTANCE__;
  }

  // If a boot is already in progress, wait for it
  if (window.__WEBCONTAINER_PROMISE__) {
    try {
      return await window.__WEBCONTAINER_PROMISE__;
    } catch {
      // If the previous attempt failed, we'll try again below
      window.__WEBCONTAINER_PROMISE__ = null;
    }
  }

  console.log("ONYX: Initializing WebContainer boot sequence...");

  window.__WEBCONTAINER_PROMISE__ = (async () => {
    try {
      // Safety check: is the environment isolated?
      if (!window.crossOriginIsolated) {
        throw new Error("Security Error: Cross-Origin Isolation headers (COOP/COEP) are missing. WebContainer requires these to be set on the server.");
      }

      const instance = await WebContainer.boot();
      window.__WEBCONTAINER_INSTANCE__ = instance;

      console.log("ONYX: WebContainer booted successfully.");
      return instance;
    } catch (err) {
      // Handle the case where another instance is already booted (e.g. lost reference during HMR)
      const isAlreadyBooted = err.message.includes('Unable to create more instances') ||
                             err.message.includes('Only a single WebContainer instance can be booted');

      if (isAlreadyBooted) {
        console.warn("ONYX: WebContainer already booted elsewhere. Please refresh to recover.");
        // We can't recover the instance if we lost the reference, but we shouldn't throw a cryptic error.
        throw new Error("WebContainer is already running. Please refresh the page to sync state.");
      }

      // Handle missing headers specifically
      if (err.message.includes('postMessage') && err.message.includes('SharedArrayBuffer')) {
        throw new Error("Security Error: Cross-Origin Isolation headers (COOP/COEP) are missing. WebContainer requires these to be set on the server.");
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

export async function teardownWebContainer() {
  if (window.__WEBCONTAINER_INSTANCE__) {
    console.log("ONYX: Tearing down WebContainer...");
    await window.__WEBCONTAINER_INSTANCE__.teardown();
    window.__WEBCONTAINER_INSTANCE__ = null;
    window.__WEBCONTAINER_PROMISE__ = null;
  }
}

export async function restartWebContainer() {
  await teardownWebContainer();
  // Wait a bit for teardown to settle
  await new Promise(r => setTimeout(r, 500));
  return await getWebContainer();
}
