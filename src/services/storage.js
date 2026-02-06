/**
 * Puter-based storage service for OnyxGPT.dev
 */

export async function listProjects() {
  if (!window.puter) return [];
  try {
    const projectsStr = await window.puter.kv.get('onyx_projects') || '[]';
    return JSON.parse(projectsStr);
  } catch (error) {
    console.error('Error listing projects:', error);
    return [];
  }
}

export async function getProject(projectId) {
  const projects = await listProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    const chatKey = `chat_${projectId}`;
    const chatStr = await window.puter.kv.get(chatKey) || '[]';
    project.chatHistory = JSON.parse(chatStr);
  }
  return project;
}

export async function createProject(title) {
  if (!window.puter) return null;
  const projects = await listProjects();
  const newProject = {
    id: Math.random().toString(36).substring(7),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  projects.push(newProject);
  await window.puter.kv.set('onyx_projects', JSON.stringify(projects));
  return newProject;
}

export async function saveProjectChat(projectId, chatHistory) {
  if (!window.puter) return;
  const chatKey = `chat_${projectId}`;
  await window.puter.kv.set(chatKey, JSON.stringify(chatHistory));

  // Also update project updatedAt
  const projects = await listProjects();
  const index = projects.findIndex(p => p.id === projectId);
  if (index >= 0) {
    projects[index].updatedAt = new Date().toISOString();
    await window.puter.kv.set('onyx_projects', JSON.stringify(projects));
  }
}
