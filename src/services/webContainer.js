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
    return window.__WEBCONTAINER_PROMISE__;
  }

  console.log("ONYX: Initializing WebContainer boot sequence...");

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
        // This is a tricky state. We don't have the instance, but we can't boot a new one.
        // In most cases, this happens because of a hot reload where the previous instance
        // wasn't correctly stored in the window object.

        // We throw a more helpful error
        throw new Error("WebContainer is already running in another part of the application. Please refresh the page to sync.");
      }

      // Clear the promise so we can retry on next call if it was a transient error
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
