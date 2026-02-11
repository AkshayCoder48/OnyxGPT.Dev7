import puter from "./puter";
import * as wc from './webContainer';

const SYSTEM_PROMPT = `You are Onyx, an autonomous AI software engineer.
You build high-quality React + Vite applications with modern UI/UX.
You act as an operator: you write files, install dependencies, and run servers in a browser-native WebContainer.

CRITICAL CONSTRAINTS:
- Framework: React + Vite ONLY. Do not use Next.js, Vue, or other frameworks.
- Styling: Tailwind CSS ONLY. Ensure tailwind.config.js and postcss.config.js are correctly configured.
- Entry Point: src/main.jsx.
- Root Component: src/App.jsx.
- Formatting: Use clean, concise Markdown. Avoid unnecessary empty lines or massive gaps between sections.
- UI/UX: Build apps that look modern, professional, and dark-themed by default unless specified otherwise.
- REASONING: Before every major action or complex logic, provide your reasoning inside <reason>...</reason> tags. This will be shown to the user as your "thought process".
- GIT TOPOLOGY: Use 'write_git_topology' to describe a git action and 'publish_git_topology' to confirm it. This visualizes your work progress in the "Activity" tab.

TOOL PROTOCOL:
- When you perform an action (like writing a file or running a command), it will be rendered as a "Task" in the UI.
- Use writeFile for all code generation.
- Use runCommand for npm installs and starting the dev server.
- Always check package.json to ensure dependencies are present.

WORKFLOW:
1. Provide a <reason> explaining the initial setup.
2. Use 'write_git_topology' for "Initial Commit" or "Project Setup".
3. Initialize package.json with necessary dependencies.
4. Configure Vite and Tailwind.
5. Create the folder structure and core components, providing <reason> and updating git topology for each phase.
6. Start the development server using 'npm run dev'.
7. Provide a final summary of the changes using Markdown.
`;

export async function chatWithAI(messages, options, onUpdate, onLog) {
  if (!puter) return;

  const tools = [
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
    {
      type: "function",
      function: {
        name: "write_git_topology",
        description: "Draft a new git commit or branch action for the topology visualization",
        parameters: {
          type: "object",
          properties: {
            branch: { type: "string", description: "The branch name, e.g., 'main' or 'feature/auth'" },
            label: { type: "string", description: "A short label for the action, e.g., 'Initial Commit'" },
            sublabel: { type: "string", description: "Optional detailed description of the work done" }
          },
          required: ["branch", "label"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "publish_git_topology",
        description: "Publish the drafted git topology action to make it visible in the activity tab",
        parameters: {
          type: "object",
          properties: {
            actionId: { type: "string", description: "A unique ID or just 'latest' to publish the most recent draft" }
          },
          required: ["actionId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "kvSet",
        description: "Set a key-value pair in Puter.js KV Store",
        parameters: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" }
          },
          required: ["key", "value"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "kvGet",
        description: "Get a value from Puter.js KV Store",
        parameters: {
          type: "object",
          properties: {
            key: { type: "string" }
          },
          required: ["key"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "fsWrite",
        description: "Write a file to Puter.js Cloud Filesystem (persistent)",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            contents: { type: "string" }
          },
          required: ["path", "contents"]
        }
      }
    }
  ];

  let currentMessages = [
    { role: "system", content: options.systemPrompt || SYSTEM_PROMPT },
    ...messages
  ];

  const modelToUse = options.customModelId || options.model || 'gpt-4o';

  while (true) {
    const response = await puter.ai.chat(currentMessages, {
      model: modelToUse,
      tools: tools,
      stream: true
    });

    let assistantMessage = { role: 'assistant', content: '', toolCalls: [] };
    let toolCall = null;

    for await (const part of response) {
      if (part.type === 'text') {
        assistantMessage.content += part.text;
        onUpdate({ ...assistantMessage });
      } else if (part.type === 'tool_use') {
        toolCall = part;
        const toolCallId = toolCall.id;

        assistantMessage.content += `\n\n[TOOL_CALL:${toolCallId}]\n\n`;

        assistantMessage.toolCalls.push({
          id: toolCallId,
          name: toolCall.name,
          input: toolCall.input,
          status: 'running',
          timestamp: new Date().toISOString()
        });
        onUpdate({ ...assistantMessage });
      }
    }

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
            if (match) options.onUrlReady(match[0]);
          });
          result = "Development server started.";
        } else {
          const exitCode = await wc.runCommand(args.command, args.args, (data) => onLog(data));
          result = `Command finished with exit code ${exitCode}.`;
          if (exitCode !== 0) status = 'error';
        }
      } else if (toolCall.name === 'write_git_topology') {
        onLog(`onyx-app $ git draft: ${args.label} on ${args.branch}`);
        result = `Git topology draft created for ${args.label}.`;
      } else if (toolCall.name === 'publish_git_topology') {
        onLog(`onyx-app $ git publish`);
        result = `Git topology action published.`;
      } else if (toolCall.name === 'kvSet') {
        onLog(`onyx-app $ kv set ${args.key}`);
        await puter.kv.set(args.key, args.value);
        result = "Value saved to Puter KV.";
      } else if (toolCall.name === 'kvGet') {
        onLog(`onyx-app $ kv get ${args.key}`);
        const val = await puter.kv.get(args.key);
        result = JSON.stringify(val);
      } else if (toolCall.name === 'fsWrite') {
        onLog(`onyx-app $ cloud-fs write ${args.path}`);
        await puter.fs.write(args.path, args.contents);
        result = "File written to Puter Cloud FS.";
      }
    } catch (err) {
      status = 'error';
      result = "Error: " + err.message;
      onLog(result);
    }

    const tcIndex = assistantMessage.toolCalls.findIndex(tc => tc.id === toolCall.id);
    if (tcIndex !== -1) {
      assistantMessage.toolCalls[tcIndex].status = status;
      assistantMessage.toolCalls[tcIndex].result = result;
      assistantMessage.toolCalls[tcIndex].completedAt = new Date().toISOString();
      onUpdate({ ...assistantMessage });
    }

    currentMessages.push({
      role: 'assistant',
      tool_calls: [{
        id: toolCall.id,
        type: 'function',
        function: { name: toolCall.name, arguments: JSON.stringify(args) }
      }]
    });
    currentMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: result
    });
  }
}
