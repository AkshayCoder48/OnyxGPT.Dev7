import { CodeSandbox } from "@codesandbox/sdk";
import { getParameters } from 'codesandbox/lib/api/define';

let sdk = null;
let client = null;
let sharedTerminal = null;
let currentProjectId = null;
let apiToken = localStorage.getItem('csb_api_token');

export function setApiToken(token) {
  apiToken = token;
  localStorage.setItem('csb_api_token', token);
  // Re-initialize SDK if token changes
  if (token) {
    sdk = new CodeSandbox(token);
  }
}

// Initialize SDK on load
if (apiToken) {
  sdk = new CodeSandbox(apiToken);
} else {
  // If no token, some operations might fail, but we'll try to use it for define
  sdk = new CodeSandbox();
}

async function createSandboxViaDefine() {
  console.log("[CSB] Defining sandbox via define API...");
  const parameters = getParameters({
    files: {
      'index.js': {
        content: 'console.log("Onyx Project Booted");',
        isBinary: false,
      },
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
      body: JSON.stringify({
        parameters: parameters
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Define API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log("[CSB] Sandbox defined with ID:", data.sandbox_id);
    return data.sandbox_id;
  } catch (err) {
    console.error("[CSB] Error in createSandboxViaDefine:", err);
    throw err;
  }
}

export async function getClient(projectId) {
  const pid = projectId || currentProjectId;
  if (!pid) throw new Error("No Project ID specified.");

  if (client && currentProjectId === pid) return client;

  if (currentProjectId !== pid) {
    client = null;
    sharedTerminal = null;
    currentProjectId = pid;
  }

  let sbId = sessionStorage.getItem(`csb_sandbox_id_${pid}`);

  if (!sbId) {
    sbId = await createSandboxViaDefine();
    sessionStorage.setItem(`csb_sandbox_id_${pid}`, sbId);
  }

  console.log("[CSB] Resuming and connecting to sandbox:", sbId);
  try {
    const sandbox = await sdk.sandboxes.resume(sbId);
    client = await sandbox.connect();
    console.log("[CSB] Connected to sandbox.");
    return client;
  } catch (err) {
    console.error("[CSB] Failed to connect to sandbox:", err);
    throw err;
  }
}

export async function getTerminal(projectId) {
  const pid = projectId || currentProjectId;
  if (sharedTerminal && currentProjectId === pid) return sharedTerminal;

  const c = await getClient(pid);
  console.log("[CSB] Creating terminal...");
  sharedTerminal = c.terminals.create();
  // We await open() to ensure it's ready for onOutput listeners
  await sharedTerminal.open();
  console.log("[CSB] Terminal opened.");
  return sharedTerminal;
}

export async function runCommand(command) {
  console.log("[CSB] AI running command:", command);
  const terminal = await getTerminal();

  // Explicitly write the command to the terminal for user visibility
  terminal.write(`\n\x1b[1;36m[ONYX AI] >> ${command}\x1b[0m\n`);

  try {
    // Run the command
    await terminal.run(command);
    return "Command executed successfully.";
  } catch (err) {
    console.error("[CSB] Command failed:", err);
    terminal.write(`\n\x1b[1;31m[ERROR] ${err.message}\x1b[0m\n`);
    throw err;
  }
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
  try {
    const entries = await c.fs.readdir(path);
    return entries;
  } catch (err) {
    console.error("Failed to list files:", err);
    return [];
  }
}

export async function getPreview(port = 5173) {
  const sbId = sessionStorage.getItem(`csb_sandbox_id_${currentProjectId}`);
  if (!sbId) return null;
  // Fallback to direct URL if client not ready
  if (client) {
     return client.hosts.getUrl(port);
  }
  return `https://${sbId}.${port}.csb.app`;
}

export function isReady() {
  return !!apiToken;
}
