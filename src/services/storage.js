/**
 * Puter-based storage service for OnyxGPT.dev
 * Uses puter.kv for persistent data and puter.fs for project files.
 */

// Save a project's metadata
export async function saveProject(project) {
  if (!window.puter) return { error: 'Puter not initialized' };

  try {
    const projectsStr = await window.puter.kv.get('onyx_projects') || '[]';
    const projects = JSON.parse(projectsStr);

    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = { ...projects[index], ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.push({ ...project, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    await window.puter.kv.set('onyx_projects', JSON.stringify(projects));
    return { data: project };
  } catch (error) {
    console.error('Error saving project:', error);
    return { error };
  }
}

// Get all projects for the current user
export async function getProjects() {
  if (!window.puter) return [];
  try {
    const projectsStr = await window.puter.kv.get('onyx_projects') || '[]';
    return JSON.parse(projectsStr);
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

// Save a chat message for a project
export async function saveMessage(projectId, message) {
  if (!window.puter) return { error: 'Puter not initialized' };
  try {
    const key = `chat_${projectId}`;
    const messagesStr = await window.puter.kv.get(key) || '[]';
    const messages = JSON.parse(messagesStr);
    messages.push({ ...message, timestamp: new Date().toISOString() });
    await window.puter.kv.set(key, JSON.stringify(messages));
    return { data: message };
  } catch (error) {
    console.error('Error saving message:', error);
    return { error };
  }
}

// Get all chat messages for a project
export async function getProjectMessages(projectId) {
  if (!window.puter) return [];
  try {
    const key = `chat_${projectId}`;
    const messagesStr = await window.puter.kv.get(key) || '[]';
    return JSON.parse(messagesStr);
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
}

// Clear chat history for a project
export async function clearProjectMessages(projectId) {
    if (!window.puter) return;
    try {
        const key = `chat_${projectId}`;
        await window.puter.kv.del(key);
    } catch (error) {
        console.error('Error clearing messages:', error);
    }
}

// GitHub Token storage
export async function saveGitHubToken(token) {
  if (!window.puter) return;
  await window.puter.kv.set('github_token', token);
}

export async function getGitHubToken() {
  if (!window.puter) return null;
  return await window.puter.kv.get('github_token');
}

export async function deleteGitHubToken() {
  if (!window.puter) return;
  await window.puter.kv.del('github_token');
}
