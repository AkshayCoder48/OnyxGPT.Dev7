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
  console.log("[CSB] Setting API Token");
  apiToken = token;
  localStorage.setItem('csb_api_token', token);
  sdk = null;
  client = null;
  sharedShell = null;
}

export function setProjectId(id) {
  if (id && currentProjectId !== id) {
    console.log("[CSB] Switching Project ID to:", id);
    currentProjectId = id;
    client = null;
    sharedShell = null;
  }
}

async function createSandboxViaDefine() {
  console.log("[CSB] Defining sandbox via define API for project:", currentProjectId);
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
    console.log("[CSB] Defined sandbox ID:", data.sandbox_id);
    return data.sandbox_id;
  } catch (err) {
    console.error("[CSB] Define failed:", err);
    throw err;
  }
}

export async function getClient(projectId) {
  const pid = projectId || currentProjectId;
  if (!pid) {
    console.error("[CSB] getClient failed: No Project ID");
    throw new Error("No Project ID specified.");
  }

  if (projectId && currentProjectId !== projectId) {
    setProjectId(projectId);
  }

  if (client) return client;

  let sbId = sessionStorage.getItem(`csb_sandbox_id_${pid}`);
  if (!sbId) {
    sbId = await createSandboxViaDefine();
    sessionStorage.setItem(`csb_sandbox_id_${pid}`, sbId);
  }

  try {
    const _sdk = await getSDK();
    console.log("[CSB] Connecting to sandbox:", sbId);
    const sandbox = await _sdk.sandboxes.resume(sbId);
    client = await sandbox.connect();
    console.log("[CSB] Client connected.");
    return client;
  } catch (err) {
    console.error("[CSB] Connect failed:", err);
    throw err;
  }
}

export async function getTerminal(projectId) {
  const pid = projectId || currentProjectId;
  const c = await getClient(pid);

  if (sharedShell) {
    console.log("[CSB] Returning existing shared shell");
    return sharedShell;
  }

  console.log("[CSB] Initializing shared shell...");
  if (c.shells) {
    sharedShell = c.shells.create();
    await sharedShell.open();
  } else if (c.commands) {
    sharedShell = await c.commands.run("bash");
  } else {
    throw new Error("Terminal support not found in SDK client.");
  }

  console.log("[CSB] Shared shell initialized.");
  return sharedShell;
}

export async function runCommand(command, projectId) {
  console.log("[CSB] Running command:", command);
  const shell = await getTerminal(projectId);
  await shell.write(`${command}\n`);
  return "Command sent to terminal.";
}

export async function writeFile(path, content, projectId) {
  const c = await getClient(projectId);
  await c.fs.writeTextFile(path, content);
}

export async function readFile(path, projectId) {
  const c = await getClient(projectId);
  return await c.fs.readTextFile(path);
}

export async function listFiles(path = "/", projectId) {
  const c = await getClient(projectId);
  if (!c) return [];
  return await c.fs.readdir(path);
}

export async function getPreviewUrl(projectId, port = 5173) {
  const pid = projectId || currentProjectId;
  const c = await getClient(pid);
  if (c && c.hosts) {
     return c.hosts.getUrl(port);
  }
  const sbId = sessionStorage.getItem(`csb_sandbox_id_${pid}`);
  return sbId ? `https://${sbId}.${port}.csb.app` : null;
}

export function isReady() {
  return !!apiToken;
}
