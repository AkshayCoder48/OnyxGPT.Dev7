import { getParameters } from 'codesandbox/lib/api/define';

let sdk = null;
let client = null;
let sharedShell = null;
let currentProjectId = null;
let apiToken = localStorage.getItem('csb_api_token');

async function getSDK() {
  if (sdk) return sdk;
  if (!apiToken) {
    throw new Error("CodeSandbox API Token is missing. Please add it in Settings.");
  }
  const { CodeSandbox } = await import("@codesandbox/sdk");
  sdk = new CodeSandbox(apiToken);
  return sdk;
}

export function setApiToken(token) {
  apiToken = token;
  localStorage.setItem('csb_api_token', token);
  sdk = null;
  client = null;
  sharedShell = null;
}

async function createSandboxViaDefine() {
  const parameters = getParameters({
    files: {
      'index.js': { content: 'console.log("Onyx Project Booted");' },
      'package.json': {
        content: {
          name: "onyx-project",
          main: "index.js",
          dependencies: {
            "vite": "latest",
            "@vitejs/plugin-react": "latest",
            "react": "latest",
            "react-dom": "latest"
          },
        },
      },
    },
  });

  try {
    const response = await fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ parameters }),
    });

    if (!response.ok) throw new Error(`Define API failed (${response.status})`);
    const data = await response.json();
    return data.sandbox_id;
  } catch (err) {
    throw err;
  }
}

export async function getClient(projectId) {
  const pid = projectId || currentProjectId;
  if (!pid) throw new Error("No Project ID specified.");

  // Update current project ID if a new one is provided
  if (projectId && currentProjectId !== projectId) {
    client = null;
    sharedShell = null;
    currentProjectId = projectId;
  }

  if (client) return client;

  let sbId = sessionStorage.getItem(`csb_sandbox_id_${pid}`);
  if (!sbId) {
    sbId = await createSandboxViaDefine();
    sessionStorage.setItem(`csb_sandbox_id_${pid}`, sbId);
  }

  try {
    const _sdk = await getSDK();
    const sandbox = await _sdk.sandboxes.resume(sbId);
    client = await sandbox.connect();
    return client;
  } catch (err) {
    throw err;
  }
}

export async function getTerminal(projectId) {
  const pid = projectId || currentProjectId;
  const c = await getClient(pid);

  if (sharedShell) return sharedShell;

  if (c.shells) {
    sharedShell = c.shells.create();
    await sharedShell.open();
  } else if (c.commands) {
    sharedShell = await c.commands.run("bash");
  } else {
    throw new Error("Terminal support not found in SDK client.");
  }

  return sharedShell;
}

export async function runCommand(command) {
  const shell = await getTerminal();
  await shell.write(`${command}\n`);
  return "Command sent to terminal.";
}

export async function writeFile(path, content) {
  const c = await getClient();
  await c.fs.writeTextFile(path, content);
}

export async function readFile(path) {
  const c = await getClient();
  return await c.fs.readTextFile(path);
}

export async function listFiles(path = "/") {
  const c = await getClient();
  if (!c) return [];
  return await c.fs.readdir(path);
}

export async function getPreviewUrl(port = 5173) {
  const c = await getClient();
  if (c && c.hosts) {
     return c.hosts.getUrl(port);
  }
  const sbId = sessionStorage.getItem(`csb_sandbox_id_${currentProjectId}`);
  return sbId ? `https://${sbId}.${port}.csb.app` : null;
}

export function isReady() {
  return !!apiToken;
}
