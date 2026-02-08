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

  const diagnostics = {
    isSecureContext: window.isSecureContext,
    crossOriginIsolated: window.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  };

  if (!diagnostics.crossOriginIsolated || !diagnostics.isSecureContext) {
    console.error("ONYX: WebContainer environment check failed:", diagnostics);
  }

  window.__WEBCONTAINER_PROMISE__ = (async () => {
    try {
      const instance = await WebContainer.boot();
      window.__WEBCONTAINER_INSTANCE__ = instance;
      console.log("ONYX: WebContainer booted successfully.");
      return instance;
    } catch (err) {
      const isAlreadyBooted = err.message.includes('Unable to create more instances') ||
                             err.message.includes('Only a single WebContainer instance can be booted') ||
                             err.message.includes('already running');

      if (isAlreadyBooted) {
        console.warn("ONYX: WebContainer already booted (instance exists but not captured).");
        // Try to recover by returning the instance if we can find it? No, we can't.
        // But we can suggest a hard refresh or using the Restart button.
        throw new Error("WebContainer is already running in another tab or was not properly closed. Please close other tabs and use the 'Restart' button.");
      }

      let errorMsg = `WebContainer Boot Error: ${err.message}`;
      if (!diagnostics.isSecureContext) {
        errorMsg = "Security Error: WebContainer requires a Secure Context (HTTPS or localhost).";
      } else if (!diagnostics.crossOriginIsolated) {
        errorMsg = "Security Error: Cross-Origin Isolation headers (COOP/COEP) are missing. Check your server configuration.";
      } else if (!diagnostics.sharedArrayBuffer) {
        errorMsg = "Security Error: SharedArrayBuffer is not supported by your browser or environment.";
      }

      window.__WEBCONTAINER_PROMISE__ = null;
      throw new Error(errorMsg);
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

  // Try to get instance from promise if it's not yet captured
  if (!window.__WEBCONTAINER_INSTANCE__ && window.__WEBCONTAINER_PROMISE__) {
    try {
      window.__WEBCONTAINER_INSTANCE__ = await window.__WEBCONTAINER_PROMISE__;
    } catch (e) {
      // Ignore if promise failed
    }
  }

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
