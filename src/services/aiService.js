import puter from "./puter";
import * as wc from './webContainer';
import { playwright } from './playwrightService';

const SYSTEM_PROMPT = `You are Onyx, an autonomous AI software engineer.
You build React + Vite applications and manage cloud infrastructure using Puter.js.

GOALS:
1. Build high-quality web applications.
2. Manage cloud state (KV), serverless compute (Workers), and persistent files (Cloud FS).
3. Use Playwright to debug deployments and ensure architectural integrity.

CLOUD AGENT CAPABILITIES:
- You can create Puter Workers to act as "Sub-Agents" or API handlers for your projects.
- You can manage cloud-native storage via Puter KV.
- You can store persistent data in Puter Cloud FS.

DEBUGGING WITH PLAYWRIGHT:
- When a project is deployed or running, use Playwright tools to inspect the live environment.
- Check for network failures (4xx, 5xx), console errors, security headers (CSP), and session issues (cookies).
- If a diagnostic shows an error, suggest a code fix and apply it using 'writeFile'.

CRITICAL CONSTRAINTS:
- Framework: React + Vite ONLY.
- NO PLAIN TEXT CODE: Always use 'writeFile' or cloud tools.
- MODERN FORMATTING: Use clean markdown, emojis, and lists. Avoid extra blank lines between list items to keep it compact.
- PUBLISHING: When you finish a significant milestone (e.g. creating a landing page, fixing a bug), use 'publish_task' to show a modern SVG-backed milestone card in the UI.
- AGENT MODE: Proceed autonomously until the user stops you or the task is finished.

TOOL PROTOCOL:
- Cloud Tools: use for persistent storage and serverless logic.
- Playwright Tools: use for verifying the app works in a real browser context.
- WebContainer Tools: use for the local dev environment and build process.
`;

export async function chatWithAI(messages, options, onUpdate, onLog) {
  if (!puter) return;

  const { signal, onUrlReady, systemPrompt, model: defaultModel, customModelId } = options;
  const modelToUse = customModelId || defaultModel || 'gpt-4o';

  const tools = [
    // WebContainer Tools
    {
      type: "function",
      function: {
        name: "writeFile",
        description: "Write content to a file in WebContainer",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            contents: { type: "string" }
          },
          required: ["path", "contents"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "runCommand",
        description: "Run a command in WebContainer terminal",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string" },
            args: { type: "array", items: { type: "string" } }
          },
          required: ["command", "args"]
        }
      }
    },
    // Puter Cloud Tools
    {
      type: "function",
      function: {
        name: "cloud_kv_op",
        description: "Perform CRUD on Puter KV Store",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["set", "get", "del", "list"] },
            key: { type: "string" },
            value: { type: "string" }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "cloud_worker_op",
        description: "Manage Puter Serverless Workers",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["create", "update", "delete", "list", "run"] },
            name: { type: "string" },
            code: { type: "string" },
            args: { type: "object" }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "cloud_fs_op",
        description: "Manage Puter Cloud Filesystem (persistent)",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["write", "read", "delete", "list"] },
            path: { type: "string" },
            contents: { type: "string" }
          },
          required: ["action"]
        }
      }
    },
    // Playwright Tools
    {
      type: "function",
      function: {
        name: "navigate_page",
        description: "Navigate Playwright to a URL and start diagnostics",
        parameters: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_browser_diagnostics",
        description: "Get structured logs, network, and security data from Playwright",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["network", "console", "cookies", "security", "full_report"] }
          },
          required: ["type"]
        }
      }
    },
    // Meta Tools
    {
      type: "function",
      function: {
        name: "manage_todo",
        description: "Track development roadmap",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["create", "update", "delete"] },
            id: { type: "string" },
            text: { type: "string" },
            status: { type: "string", enum: ["pending", "completed"] }
          },
          required: ["action", "id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "publish_task",
        description: "Officially publish a completed task with a name and icon (SVG icon name from Lucide)",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            icon: { type: "string", description: "Lucide icon name like CheckCircle, Rocket, Layers, etc." },
            summary: { type: "string" }
          },
          required: ["name", "icon", "summary"]
        }
      }
    }
  ];

  let currentConversation = [
    { role: "system", content: systemPrompt || SYSTEM_PROMPT },
    ...messages
  ];

  while (true) {
    if (signal?.aborted) break;

    const response = await puter.ai.chat(currentConversation, {
      model: modelToUse,
      tools: tools,
      stream: true
    });

    let assistantMessage = { role: 'assistant', content: '', toolCalls: [] };
    let toolCall = null;

    try {
      for await (const part of response) {
        if (signal?.aborted) break;

        if (part.type === 'text') {
          assistantMessage.content += part.text;
          onUpdate([...messages, assistantMessage]);
        } else if (part.type === 'tool_use') {
          toolCall = part;
          assistantMessage.content += `\n\n[TOOL_CALL:${toolCall.id}]\n\n`;
          assistantMessage.toolCalls.push({
            id: toolCall.id,
            name: toolCall.name,
            input: toolCall.input,
            status: 'running',
            timestamp: new Date().toISOString()
          });
          onUpdate([...messages, assistantMessage]);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') break;
      throw err;
    }

    if (signal?.aborted) break;

    currentConversation.push({
      role: 'assistant',
      content: assistantMessage.content,
      tool_calls: assistantMessage.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.input) }
      }))
    });

    messages = [...messages, assistantMessage];

    if (!toolCall) break;

    let result;
    let status = 'success';
    const args = toolCall.input;

    try {
      if (toolCall.name === 'writeFile') {
        onLog(`onyx-app $ write ${args.path}`);
        await wc.writeFile(args.path, args.contents);
        result = `File written to ${args.path}.`;
      } else if (toolCall.name === 'runCommand') {
        const fullCmd = `${args.command} ${args.args.join(' ')}`;
        onLog(`onyx-app $ ${fullCmd}`);
        if (args.command === 'npm' && args.args.includes('dev')) {
          wc.runCommand(args.command, args.args, (data) => {
            onLog(data);
            const match = data.match(/http:\/\/localhost:\d+/);
            if (match) onUrlReady(match[0]);
          });
          result = "Development server started.";
        } else {
          const exitCode = await wc.runCommand(args.command, args.args, (data) => onLog(data));
          result = `Command finished with exit code ${exitCode}.`;
          if (exitCode !== 0) status = 'error';
        }
      } else if (toolCall.name === 'cloud_kv_op') {
        onLog(`cloud $ kv ${args.action} ${args.key || ''}`);
        if (args.action === 'set') await puter.kv.set(args.key, args.value);
        else if (args.action === 'del') await puter.kv.del(args.key);
        else if (args.action === 'get') result = JSON.stringify(await puter.kv.get(args.key));
        else if (args.action === 'list') result = JSON.stringify(await puter.kv.list());
        if (!result) result = `KV ${args.action} completed.`;
      } else if (toolCall.name === 'cloud_worker_op') {
        onLog(`cloud $ worker ${args.action} ${args.name || ''}`);
        if (args.action === 'create') await puter.worker.create(args.name, args.code);
        else if (args.action === 'run') result = JSON.stringify(await puter.worker.run(args.name, args.args));
        result = `Worker ${args.name || ''} ${args.action}ed.`;
      } else if (toolCall.name === 'cloud_fs_op') {
        onLog(`cloud $ fs ${args.action} ${args.path || ''}`);
        if (args.action === 'write') await puter.fs.write(args.path, args.contents);
        else if (args.action === 'read') result = await puter.fs.read(args.path);
        if (!result) result = `FS ${args.action} completed.`;
      } else if (toolCall.name === 'navigate_page') {
        onLog(`playwright $ navigate ${args.url}`);
        const nav = await playwright.navigate_page(args.url);
        result = JSON.stringify(nav);
      } else if (toolCall.name === 'get_browser_diagnostics') {
        onLog(`playwright $ diagnostics: ${args.type}`);
        if (args.type === 'network') result = JSON.stringify(playwright.get_network_log());
        else if (args.type === 'console') result = JSON.stringify(playwright.get_console_logs());
        else if (args.type === 'full_report') result = JSON.stringify(playwright.generate_bug_report());
        else result = "Diagnostic data retrieved.";
      } else if (toolCall.name === 'publish_task') {
        onLog(`task $ published: ${args.name}`);
        result = `Task "${args.name}" published with icon ${args.icon}.`;
      } else if (toolCall.name === 'manage_todo') {
        result = `Todo ${args.id} ${args.action}ed.`;
      }
    } catch (err) {
      status = 'error';
      result = "Error: " + err.message;
    }

    const lastMsg = messages[messages.length - 1];
    const tcIndex = lastMsg.toolCalls.findIndex(tc => tc.id === toolCall.id);
    if (tcIndex !== -1) {
      lastMsg.toolCalls[tcIndex].status = status;
      lastMsg.toolCalls[tcIndex].result = result;
      onUpdate([...messages]);
    }

    currentConversation.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: result
    });
  }

  return messages;
}
