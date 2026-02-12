import puter from "./puter";
import * as wc from './webContainer';

const SYSTEM_PROMPT = `You are Onyx, an autonomous AI software engineer.
You build high-quality React + Vite applications with modern UI/UX.
You act as an engine: you write files, install dependencies, and run servers in a browser-native WebContainer.

CRITICAL CONSTRAINTS:
- Framework: React + Vite ONLY.
- Styling: Tailwind CSS ONLY.
- NO PLAIN TEXT CODE: Never write code blocks in your text response. ALWAYS use the 'writeFile' tool. If you output a code block in text, the user cannot see it or use it. IT MUST BE WRITTEN TO A FILE.
- TOOL CALLS ONLY: All modifications to the filesystem or terminal must be done via tools.
- REASONING: Provide your reasoning inside <reason>...</reason> tags before or after tool calls.
- AGENT MODE: You are in autonomous mode. After a tool execution, if there are more steps to complete the app, continue to the next step immediately.

TODO MANAGEMENT:
- Use 'manage_todo' to track progress. Create todos at the start, and update them as you finish tasks.

GIT TOPOLOGY:
- Use 'write_git_topology' and 'publish_git_topology' to visualize progress.

WORKFLOW:
1. Create TODOs for the project.
2. Initialize project structure.
3. Write components and logic (using tools only).
4. Run 'npm run dev' and verify.
`;

export async function chatWithAI(messages, options, onUpdate, onLog) {
  if (!puter) return;

  const { signal, onUrlReady, systemPrompt, model: defaultModel, customModelId } = options;
  const modelToUse = customModelId || defaultModel || 'gpt-4o';

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
        name: "manage_todo",
        description: "Create, update, or delete a TODO item",
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
        name: "write_git_topology",
        description: "Draft a new git commit or branch action",
        parameters: {
          type: "object",
          properties: {
            branch: { type: "string" },
            label: { type: "string" },
            sublabel: { type: "string" }
          },
          required: ["branch", "label"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "publish_git_topology",
        description: "Publish the drafted git topology action",
        parameters: {
          type: "object",
          properties: {
            actionId: { type: "string" }
          },
          required: ["actionId"]
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

    // Persist assistant message to conversation
    currentConversation.push({
      role: 'assistant',
      content: assistantMessage.content,
      tool_calls: assistantMessage.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.input) }
      }))
    });

    // We update the 'messages' passed to the UI so it includes this assistant message
    messages = [...messages, assistantMessage];

    if (!toolCall) break;

    // Execute Tool
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
      } else if (toolCall.name === 'manage_todo') {
        onLog(`onyx-app $ todo ${args.action} ${args.id}`);
        result = `Todo ${args.id} ${args.action}ed.`;
      } else if (toolCall.name === 'write_git_topology') {
        result = "Git topology draft created.";
      } else if (toolCall.name === 'publish_git_topology') {
        result = "Git topology action published.";
      }
    } catch (err) {
      status = 'error';
      result = "Error: " + err.message;
    }

    // Update tool call status in the message history for UI
    const lastMsg = messages[messages.length - 1];
    const tcIndex = lastMsg.toolCalls.findIndex(tc => tc.id === toolCall.id);
    if (tcIndex !== -1) {
      lastMsg.toolCalls[tcIndex].status = status;
      lastMsg.toolCalls[tcIndex].result = result;
      onUpdate([...messages]);
    }

    // Push tool result to AI conversation
    currentConversation.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: result
    });
  }

  return messages;
}
