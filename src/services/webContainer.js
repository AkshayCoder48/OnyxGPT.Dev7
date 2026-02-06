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
      // If the promise failed with a security or boot error, we might need a refresh.
      // But let's allow one retry if it was a different error.
      if (!e.message.includes('SharedArrayBuffer') && !e.message.includes('instances')) {
        window.__WEBCONTAINER_PROMISE__ = null;
      } else {
        throw e;
      }
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
        console.warn("ONYX: WebContainer already booted elsewhere.");
        throw new Error("WebContainer instance already exists. If you see this, please try refreshing the page to reconnect.");
      }

      if (err.message.includes('postMessage') && err.message.includes('SharedArrayBuffer')) {
        throw new Error("Security Error: Cross-Origin Isolation (COOP/COEP) headers are missing. This is usually caused by the hosting environment or a missing server configuration.");
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
