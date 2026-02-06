import { getProjects, saveProject } from './storage';

const SYSTEM_PROMPT = `You are OnyxGPT, an elite autonomous software architect. Your goal is to build complex, production-ready applications with precision.

CRITICAL DIRECTIVES:
1.  ALWAYS maintain a clear Roadmap (TODOs) for the user.
2.  Communicate in a professional, efficient, and conversational tone.
3.  Use advanced markdown (headers, tables, code blocks) to structure your thoughts.
4.  Focus on modular, clean, and well-documented code.
5.  If a task is complex, break it down into logical phases.
6.  When you complete a task, update the Roadmap.

CORE CAPABILITIES:
-   Full-stack development in an isolated WebContainer.
-   Direct terminal access and file system control.
-   Project architecture and design.
-   Bug diagnosis and resolution.
`;

export const manageTodos = async (projectId, task, action = 'add') => {
  const projects = await getProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return [];

  let todos = project.todos || [];
  if (action === 'add') {
    todos.push({ task, completed: false });
  } else if (action === 'complete') {
    todos = todos.map(t => t.task === task ? { ...t, completed: true } : t);
  } else if (action === 'remove') {
    todos = todos.filter(t => t.task !== task);
  } else if (action === 'set') {
    // Expecting task to be an array of strings
    todos = task.map(t => ({ task: t, completed: false }));
  }

  project.todos = todos;
  await saveProject(project);
  return todos;
};

export const generateResponse = async ({
  messages,
  projectId,
  modelId = 'gemini-1.5-pro',
  settings = {},
  tools = [],
  onToolCall = () => {}
}) => {
  try {
    const formattedMessages = [
      { role: 'system', content: settings.systemPrompt || SYSTEM_PROMPT },
      ...messages
    ];

    const response = await window.puter.ai.chat(formattedMessages, {
      model: modelId,
      temperature: settings.temperature ?? 0.7,
      max_tokens: settings.maxTokens ?? 4096,
      tools: [
        ...tools,
        {
          name: 'manage_roadmap',
          description: 'Update the project roadmap (TODOs)',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'complete', 'remove', 'set'] },
              task: { type: 'string', description: 'The task description' },
              tasks: { type: 'array', items: { type: 'string' }, description: 'List of tasks for "set" action' }
            },
            required: ['action']
          }
        }
      ]
    });

    const message = response.message;

    if (message.tool_calls) {
      for (const call of message.tool_calls) {
        if (call.function.name === 'manage_roadmap') {
          const { action, task, tasks } = JSON.parse(call.function.arguments);
          const updatedTodos = await manageTodos(projectId, tasks || task, action);
          onToolCall('manage_roadmap', updatedTodos);
        }
      }
    }

    return message;
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw error;
  }
};
