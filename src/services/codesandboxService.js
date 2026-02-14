import { connectToSandbox } from "@codesandbox/sdk/browser";

let client = null;
let apiToken = localStorage.getItem('csb_api_token');

export function setApiToken(token) {
  apiToken = token;
  localStorage.setItem('csb_api_token', token);
}

async function createSandboxViaAPI(token) {
  const response = await fetch('https://api.codesandbox.io/api/v1/sandboxes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sandbox: {
        title: "Onyx Project",
        template: "node"
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.errors?.detail || "Failed to create sandbox");
  }

  const data = await response.json();
  return data.data.id;
}

export async function getClient() {
  if (client) return client;

  let sbId = sessionStorage.getItem('csb_sandbox_id');

  if (!sbId) {
    if (!apiToken) {
       // For preview only, we might not need a key if we have a public sandbox ID
       // but for building, we need one.
       // We'll return null or throw if we need to write.
       return null;
    }
    sbId = await createSandboxViaAPI(apiToken);
    sessionStorage.setItem('csb_sandbox_id', sbId);
  }

  client = await connectToSandbox({ sandboxId: sbId });
  return client;
}

export async function getTerminal() {
  const c = await getClient();
  if (!c) throw new Error("Sandbox client not initialized. Please provide an API token.");
  return await c.terminals.create();
}

export async function runCommand(command) {
  const c = await getClient();
  if (!c) throw new Error("Sandbox client not initialized.");
  const shell = await c.terminals.create();
  await shell.write(command + "\n");
  return "Command sent to terminal.";
}

export async function writeFile(path, content) {
  const c = await getClient();
  if (!c) throw new Error("Sandbox client not initialized.");
  await c.fs.writeTextFile(path, content);
}

export async function readFile(path) {
  const c = await getClient();
  if (!c) throw new Error("Sandbox client not initialized.");
  return await c.fs.readTextFile(path);
}

export async function getPreview(port = 5173) {
  const sbId = sessionStorage.getItem('csb_sandbox_id');
  if (!sbId) return null;
  // Previews can be accessed via URL without full SDK client if public
  return `https://${sbId}.${port}.csb.app`;
}

export function isReady() {
  return !!apiToken;
}
