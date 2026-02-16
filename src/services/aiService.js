import * as csb from './codesandboxService';

const SYSTEM_PROMPT = `You are Onyx, an autonomous AI software engineer.
You build high-quality React + Vite applications with modern UI/UX.
You act as an operator: you write files, install dependencies, and run servers in a CodeSandbox environment.

CRITICAL CONSTRAINTS:
- Framework: React + Vite ONLY.
- Styling: Tailwind CSS ONLY.
- Entry Point: src/main.jsx.
- Root Component: src/App.jsx.
- UI/UX: Build apps that look modern, professional, and dark-themed (Onyx theme).

TOOL PROTOCOL:
- Use writeFile for all code generation.
- Use runCommand for npm installs and starting the dev server.
- Use readFile to analyze existing files.
- Use runPlaywright for end-to-end testing.
- Always check package.json to ensure dependencies are present.

SUMMARY PROTOCOL:
Whenever you successfully complete a tool call, you MUST provide a brief summary of what you did in your next response.
Examples:
- "I have successfully updated the src/App.jsx file."
- "I have run the command npm install and it completed successfully."
- "I have pushed the latest changes to GitHub."
`;

export async function chatWithAI(messages, options, onUpdate, onLog) {
  if (!window.puter) return;

  const projectId = options.projectId;

  const tools = [
    {
      type: "function",
      function: {
        name: "writeFile",
        description: "Write content to a file in CodeSandbox",
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
        name: "readFile",
        description: "Read content of a file in CodeSandbox",
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
        name: "runCommand",
        description: "Run a command in CodeSandbox terminal",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string" }
          },
          required: ["command"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "runPlaywright",
        description: "Run Playwright tests in CodeSandbox",
        parameters: {
          type: "object",
          properties: {
            testPath: { type: "string", description: "Optional path to a specific test file" }
          }
        }
      }
    }
  ];

  let currentMessages = [
    { role: "system", content: options.systemPrompt || SYSTEM_PROMPT },
    ...messages
  ];

  let sessionMessages = [];

  const updateUI = () => {
    onUpdate([...sessionMessages]);
  };

  while (true) {
    const response = await window.puter.ai.chat(currentMessages, {
      model: options.customModelId || options.model,
      tools: tools,
      stream: true
    });

    let assistantMessage = { role: 'assistant', content: '', toolCalls: [] };
    sessionMessages.push(assistantMessage);
    let hasToolCallInThisTurn = false;

    for await (const part of response) {
      if (part.type === 'text') {
        assistantMessage.content += part.text;
        updateUI();
      } else if (part.type === 'tool_use') {
        hasToolCallInThisTurn = true;
        const toolCall = part;
        const toolCallId = toolCall.id;

        assistantMessage.content += `\n\n[TOOL_CALL:${toolCallId}]\n\n`;
        assistantMessage.toolCalls.push({
          id: toolCallId,
          name: toolCall.name,
          input: toolCall.input,
          status: 'running'
        });
        updateUI();

        let result;
        let status = 'success';
        const args = toolCall.input;

        try {
          if (toolCall.name === 'writeFile') {
            onLog(`onyx-app $ Updating file ${args.path}`);
            await csb.writeFile(args.path, args.contents, projectId);
            result = `File written to ${args.path}.`;
          } else if (toolCall.name === 'readFile') {
            onLog(`onyx-app $ Reading file ${args.path}`);
            result = await csb.readFile(args.path, projectId);
          } else if (toolCall.name === 'runCommand') {
            onLog(`onyx-app $ ${args.command}`);
            const output = await csb.runCommand(args.command, projectId);
            result = output || "Command executed successfully.";
          } else if (toolCall.name === 'runPlaywright') {
            const cmd = args.testPath ? `npx playwright test ${args.testPath}` : "npx playwright test";
            onLog(`onyx-app $ ${cmd}`);
            const output = await csb.runCommand(cmd, projectId);
            result = output || "Playwright tests completed.";
          }
        } catch (err) {
          status = 'error';
          result = "Error: " + err.message;
          onLog(result);
        }

        const tcIndex = assistantMessage.toolCalls.findIndex(tc => tc.id === toolCallId);
        if (tcIndex !== -1) {
          assistantMessage.toolCalls[tcIndex].status = status;
          assistantMessage.toolCalls[tcIndex].result = result;
          updateUI();
        }

        currentMessages.push({
          role: 'assistant',
          tool_calls: [{
            id: toolCallId,
            type: 'function',
            function: { name: toolCall.name, arguments: JSON.stringify(args) }
          }]
        });

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: result
        });
      }
    }

    if (!hasToolCallInThisTurn) break;
  }
}
