import * as wc from './webContainer';

const SYSTEM_PROMPT = `You are Onyx, an autonomous AI software engineer.
You build high-quality React + Vite applications with modern UI/UX.
You act as an operator: you write files, install dependencies, and run servers in a browser-native WebContainer.

CRITICAL CONSTRAINTS:
- Framework: React + Vite ONLY.
- Styling: Tailwind CSS ONLY.
- Entry Point: src/main.jsx.
- Root Component: src/App.jsx.
- UI/UX: Build apps that look modern, professional, and dark-themed (Onyx theme).

TOOL PROTOCOL:
- Use isTerminalBooted to check if the environment is ready before running commands.
- Use writeFile for all code generation.
- Use runCommand for npm installs and starting the dev server.
- Always check package.json to ensure dependencies are present.

TERMINAL STATUS:
You can now know if the terminal is booted. If isTerminalBooted returns false, you must wait or ask the user to restart the container.
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
        name: "isTerminalBooted",
        description: "Check if the WebContainer terminal environment is booted and ready",
        parameters: {
          type: "object",
          properties: {}
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
        const toolCallId = toolCall.id;
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
          onLog(`[SYSTEM] Starting development server...`);
          wc.runCommand(args.command, args.args, (data) => {
            onLog(data);
            const match = data.match(/http:\/\/localhost:\d+/);
            if (match) options.onUrlReady(match[0]);
          });
          result = "Development server started. Check activity feed for logs.";
        } else {
          onLog(`[SYSTEM] Running command...`);
          const exitCode = await wc.runCommand(args.command, args.args, (data) => onLog(data));
          result = `Command finished with exit code ${exitCode}.`;
          if (exitCode !== 0) status = 'error';
        }
      } else if (toolCall.name === 'isTerminalBooted') {
        const booted = wc.isWebContainerBooted();
        result = booted ? "Terminal is booted and ready." : "Terminal is NOT booted. Please wait or restart.";
        onLog(`[SYSTEM] Terminal status check: ${booted ? 'READY' : 'NOT_READY'}`);
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
