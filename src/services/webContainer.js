import { WebContainer } from '@webcontainer/api';

let webcontainerPromise = null;

export async function getWebContainer() {
  if (webcontainerPromise) return webcontainerPromise;

  webcontainerPromise = WebContainer.boot();

  try {
    return await webcontainerPromise;
  } catch (err) {
    webcontainerPromise = null;
    throw err;
  }
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
      if (onData) onData(typeof data === 'string' ? data : decoder.decode(data));
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
