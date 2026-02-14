import { connectToSandbox } from "@codesandbox/sdk/browser";
import { getParameters } from 'codesandbox/lib/api/define';

let client = null;
let sharedTerminal = null;
let currentProjectId = null;
let apiToken = localStorage.getItem('csb_api_token');

export function setApiToken(token) {
  apiToken = token;
  localStorage.setItem('csb_api_token', token);
}

async function createSandboxViaDefine() {
  const parameters = getParameters({
    files: {
      'index.js': {
        content: 'console.log("Onyx Project Booted");',
        isBinary: false,
      },
      'package.json': {
        content: {
          name: "onyx-project",
          dependencies: {},
        },
      },
    },
  });

  const response = await fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parameters: parameters
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to define sandbox");
  }

  const data = await response.json();
  return data.sandbox_id;
}

export async function getClient(projectId) {
  const pid = projectId || currentProjectId;
  if (!pid) throw new Error("No Project ID specified for CodeSandbox client.");

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

  client = await connectToSandbox({
    sandboxId: sbId,
    token: apiToken
  });
  return client;
}

export async function getTerminal(projectId) {
  const pid = projectId || currentProjectId;
  if (sharedTerminal && currentProjectId === pid) return sharedTerminal;

  const c = await getClient(pid);
  sharedTerminal = c.terminals.create();
  await sharedTerminal.open();
  return sharedTerminal;
}

export async function runCommand(command) {
  const terminal = await getTerminal();
  // Use a more distinct echo for AI commands
  terminal.write(`\n\x1b[1;36m[ONYX AI] >> ${command}\x1b[0m\n`);
  await terminal.run(command);
  return "Command executed.";
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
  return `https://${sbId}.${port}.csb.app`;
}

export function isReady() {
  return !!apiToken;
}
