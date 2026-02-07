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

    // Ensure project directory exists in Puter FS
    const projectPath = `.onyx/projects/${project.id}`;
    await window.puter.fs.mkdir(projectPath, { recursive: true });

    return { data: project };
  } catch (error) {
    console.error('Error saving project:', error);
    return { error };
  }
}

// Persist a file to Puter FS for a specific project
export async function persistFile(projectId, path, content) {
  if (!window.puter) return;
  try {
    const fullPath = `.onyx/projects/${projectId}/${path}`;
    // Ensure parent directory exists
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (dir) await window.puter.fs.mkdir(dir, { recursive: true });
    await window.puter.fs.write(fullPath, content);
  } catch (error) {
    console.error('Error persisting file to Puter FS:', error);
  }
}

// Load all persisted files for a project
export async function getPersistedFiles(projectId) {
  if (!window.puter) return [];
  try {
    const projectPath = `.onyx/projects/${projectId}`;
    const files = [];

    const traverse = async (path) => {
      const items = await window.puter.fs.readdir(path);
      for (const item of items) {
        const itemPath = `${path}/${item.name}`;
        if (item.is_dir) {
          await traverse(itemPath);
        } else {
          const content = await window.puter.fs.read(itemPath);
          // Relative path for WebContainer
          const relPath = itemPath.replace(`.onyx/projects/${projectId}/`, '');
          files.push({ path: relPath, content });
        }
      }
    };

    await traverse(projectPath);
    return files;
  } catch (error) {
    console.error('Error loading persisted files:', error);
    return [];
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

// Overwrite all messages for a project (more robust for complex conversations)
export async function saveMessages(projectId, messages) {
  if (!window.puter) return { error: 'Puter not initialized' };
  try {
    const key = `chat_${projectId}`;
    await window.puter.kv.set(key, JSON.stringify(messages));
    return { data: messages };
  } catch (error) {
    console.error('Error saving messages:', error);
    return { error };
  }
}
