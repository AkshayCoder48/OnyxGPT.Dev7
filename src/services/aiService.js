import * as wc from './webContainer';

const SYSTEM_PROMPT = `You are Onyx, an autonomous, conversational, and highly skilled AI software engineer.
You build modern React + Vite applications with a focus on clean UI and robust logic.

Tone and Style:
- Be conversational, helpful, and proactive. Don't wait for permission to start building if the task is clear.
- Start every new project by greeting the user and proposing a comprehensive plan using 'updateTodos'.
- Use beautiful markdowns, bold text, and lists to make your responses readable.
- After every significant step (like creating a file or running a command), update the TODO list to reflect progress.
- If a TODO is completed, mark it as 'completed: true' in the 'updateTodos' call.

Constraints:
- Framework: React + Vite ONLY.
- UI: Use modern, sleek designs with Tailwind CSS.
- Entry: src/main.jsx, Root: src/App.jsx.
- Always initialize the project with a proper package.json and vite configuration.

Tools available:
- writeFile(path, contents): Create or update a file in WebContainer.
- runCommand(command, args): Run terminal commands in WebContainer.
- updateTodos(todos): Update the project TODO list. 'todos' is an array of objects: { task: string, completed: boolean }.
- readFile(path): Read file contents from WebContainer.
- listFiles(path): List files in WebContainer directory.
- kvSet(key, value): Save data to Puter.js Key-Value store.
- kvGet(key): Retrieve data from Puter.js Key-Value store.
- fsWrite(path, contents): Write a file to Puter.js Cloud Filesystem.
- fsRead(path): Read a file from Puter.js Cloud Filesystem.

Workflow:
1. Propose a plan and update TODOs.
2. Initialize package.json and project structure.
3. Iteratively build features, updating TODOs as you go.
4. Run 'npm run dev' to show progress.
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
    },
    {
      type: "function",
      function: {
        name: "updateTodos",
        description: "Update the project TODO list",
        parameters: {
          type: "object",
          properties: {
            todos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  completed: { type: "boolean" }
                },
                required: ["task", "completed"]
              }
            }
          },
          required: ["todos"]
        }
      }
    }
  ];

  let currentMessages = [
    { role: "system", content: (options.systemPrompt || SYSTEM_PROMPT) + `\nCurrent project TODOs: ${JSON.stringify(options.todos || [])}` },
    ...messages
  ];

  const modelToUse = options.customModelId || options.model;
  let finalAssistantMessage = { role: 'assistant', content: '', toolCalls: [] };

  while (true) {
    const response = await window.puter.ai.chat(currentMessages, {
      model: modelToUse,
      tools: tools,
      stream: true
    });

    let currentIterationMessage = { role: 'assistant', content: '', toolCalls: [] };
    let iterationToolCalls = [];

    for await (const part of response) {
      if (part.type === 'text') {
        currentIterationMessage.content += part.text;
        finalAssistantMessage.content += part.text;
        onUpdate({ ...finalAssistantMessage });
      } else if (part.type === 'tool_use') {
        iterationToolCalls.push(part);
        const tc = {
          id: part.id,
          name: part.name,
          input: part.input,
          status: 'running'
        };
        currentIterationMessage.toolCalls.push(tc);
        finalAssistantMessage.toolCalls.push(tc);
        onUpdate({ ...finalAssistantMessage });
      }
    }

    // Push the assistant's turn (text and/or tool calls) to history
    const historyEntry = { role: 'assistant', content: currentIterationMessage.content || '' };
    if (iterationToolCalls.length > 0) {
      historyEntry.tool_calls = iterationToolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.input) }
      }));
    }
    currentMessages.push(historyEntry);

    if (iterationToolCalls.length === 0) break;

    // Execute all tool calls in this turn
    for (const toolCall of iterationToolCalls) {
      let result;
      let status = 'success';
      const args = toolCall.input;

      try {
        if (toolCall.name === 'writeFile') {
          onLog(`onyx-app $ write ${args.path}`);
          await wc.writeFile(args.path, args.contents);
          result = `File written to ${args.path}.`;
          if (options.onFilesUpdate) options.onFilesUpdate();
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
        } else if (toolCall.name === 'updateTodos') {
          if (options.onTodosUpdate) {
            options.onTodosUpdate(args.todos);
          }
          result = "TODO list updated.";
        }
      } catch (err) {
        status = 'error';
        result = "Error: " + err.message;
        onLog(result);
      }

      const tcIndex = finalAssistantMessage.toolCalls.findIndex(tc => tc.id === toolCall.id);
      if (tcIndex !== -1) {
        finalAssistantMessage.toolCalls[tcIndex].status = status;
        finalAssistantMessage.toolCalls[tcIndex].result = result;
        onUpdate({ ...finalAssistantMessage });
      }

      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result
      });
    }
  }
}
