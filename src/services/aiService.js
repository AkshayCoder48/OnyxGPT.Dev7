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

TOOL PROTOCOL:
- When you perform an action (like writing a file or running a command), it will be rendered as a "Task" in the UI.
- Use writeFile for all code generation.
- Use runCommand for npm installs and starting the dev server.
- Always check package.json to ensure dependencies are present.

WORKFLOW:
1. Initialize package.json with necessary dependencies (react, react-dom, lucide-react, etc.).
2. Configure Vite and Tailwind.
3. Create the folder structure and core components.
4. Start the development server using 'npm run dev'.
5. Provide a brief summary of the changes using Markdown.
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

  const modelToUse = options.customModelId || options.model;

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

        // Add a marker in content to allow interleaved rendering
        assistantMessage.content += `\n\n[TOOL_CALL:${toolCallId}]\n\n`;

        assistantMessage.toolCalls.push({
          id: toolCallId,
          name: toolCall.name,
          input: toolCall.input,
          status: 'running'
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
