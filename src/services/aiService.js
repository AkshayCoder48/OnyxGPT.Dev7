import * as wc from './webContainer';

const DEFAULT_SYSTEM_PROMPT = `You are Onyx, an autonomous AI software engineer.
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
- kvSet(key, value): Save data to Puter.js Key-Value store.
- kvGet(key): Retrieve data from Puter.js Key-Value store.
- fsWrite(path, contents): Write a file to Puter.js Cloud Filesystem.
- fsRead(path): Read a file from Puter.js Cloud Filesystem.

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
    { role: "system", content: options.systemPrompt || DEFAULT_SYSTEM_PROMPT },
    ...messages
  ];

  const modelToUse = options.model || 'gpt-4o';

  while (true) {
    const response = await window.puter.ai.chat(currentMessages, {
      model: modelToUse,
      tools: tools,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
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
        assistantMessage.toolCalls.push({
          id: toolCall.id,
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
        await window.puter.kv.set(args.key, args.value);
        result = "Value saved to Puter KV.";
      } else if (toolCall.name === 'kvGet') {
        onLog(`onyx-app $ kv get ${args.key}`);
        const val = await window.puter.kv.get(args.key);
        result = JSON.stringify(val);
      } else if (toolCall.name === 'fsWrite') {
        onLog(`onyx-app $ cloud-fs write ${args.path}`);
        await window.puter.fs.write(args.path, args.contents);
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
