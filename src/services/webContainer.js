import { WebContainer } from '@webcontainer/api';

let webcontainerInstance;
let bootPromise;
let serverReadyCallback;

export async function getWebContainer() {
  if (webcontainerInstance) return webcontainerInstance;
  if (bootPromise) return bootPromise;

  bootPromise = WebContainer.boot().then(instance => {
    webcontainerInstance = instance;

    // Listen for server-ready events
    instance.on('server-ready', (port, url) => {
      if (serverReadyCallback) {
        serverReadyCallback(url);
      }
    });

    return instance;
  });

  return bootPromise;
}

export function onServerReady(callback) {
  serverReadyCallback = callback;
}

export async function writeFile(path, contents) {
  const wc = await getWebContainer();
  // Ensure parent directories exist
  const parts = path.split('/');
  if (parts.length > 1) {
    let current = '';
    for (let i = 0; i < parts.length - 1; i++) {
      current += (current ? '/' : '') + parts[i];
      try {
        await wc.fs.mkdir(current, { recursive: true });
      } catch {
         /* ignore */
      }
    }
  }
  await wc.fs.writeFile(path, contents);
}

export async function readFile(path) {
  const wc = await getWebContainer();
  return await wc.fs.readFile(path, 'utf-8');
}

export async function runCommand(command, args, onData) {
  const wc = await getWebContainer();
  const process = await wc.spawn(command, args);

  process.output.pipeTo(new WritableStream({
    write(data) {
      if (onData) onData(data);
    }
  }));

  return process.exit;
}

export async function listFiles(path = '/') {
  const wc = await getWebContainer();
  try {
    return await wc.fs.readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}
