import * as wc from './webContainer';

const SYSTEM_PROMPT = `You are Onyx, an autonomous AI software engineer.
You build React + Vite applications.
You act as an operator: you write files, install dependencies, and run servers.

Constraints:
- Framework: React + Vite ONLY.
- Entry: src/main.jsx, Root: src/App.jsx.
- Use tailwindcss for styling.

Tools available:
- writeFile(path, contents): Create or update a file in WebContainer.
- runCommand(command, args): Run terminal commands in WebContainer.
- readFile(path): Read file contents from WebContainer.
- listFiles(path): List files in WebContainer directory.

Workflow:
1. Initialize package.json with react and vite.
2. Install dependencies.
3. Create src/main.jsx and src/App.jsx.
4. Run 'npm run dev'.
`;

export async function chatWithAI(messages, options, onUpdate, onLog) {
  if (!window.puter) return;

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
        name: "readFile",
        description: "Read a file from WebContainer",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "listFiles",
        description: "List files in a directory",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" }
          }
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
    const response = await window.puter.ai.chat(currentMessages, {
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
        assistantMessage.toolCalls.push(toolCall);
        onUpdate({ ...assistantMessage });
      }
    }

    if (!toolCall) break;

    onLog(`AI calling ${toolCall.name}...`);
    let result;
    const args = toolCall.input;

    try {
      if (toolCall.name === 'writeFile') {
        await wc.writeFile(args.path, args.contents);
        result = "File written to WebContainer.";
      } else if (toolCall.name === 'runCommand') {
        if (args.command === 'npm' && args.args.includes('dev')) {
          wc.runCommand(args.command, args.args, (data) => {
            onLog(data);
            const match = data.match(/http:\/\/localhost:\d+/);
            if (match && options.onUrlReady) options.onUrlReady(match[0]);
          });
          result = "Server started.";
        } else {
          await wc.runCommand(args.command, args.args, (data) => onLog(data));
          result = "Command finished.";
        }
      } else if (toolCall.name === 'readFile') {
        result = await wc.readFile(args.path);
      } else if (toolCall.name === 'listFiles') {
        const files = await wc.listFiles(args.path || '/');
        result = JSON.stringify(files);
      }
    } catch (err) {
      result = "Error: " + err.message;
      onLog(result);
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
