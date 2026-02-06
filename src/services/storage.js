export const getProjects = async () => {
  if (!window.puter) return [];
  const projects = await window.puter.kv.get('onyx_projects');
  return projects ? JSON.parse(projects) : [];
};

export const saveProject = async (project) => {
  if (!window.puter) return;
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.push({ ...project, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  await window.puter.kv.set('onyx_projects', JSON.stringify(projects));
};

export const deleteProject = async (id) => {
  if (!window.puter) return;
  const projects = await getProjects();
  const filtered = projects.filter(p => p.id !== id);
  await window.puter.kv.set('onyx_projects', JSON.stringify(filtered));
};

export const getProjectMessages = async (id) => {
  if (!window.puter) return [];
  const messages = await window.puter.kv.get(`onyx_messages_${id}`);
  return messages ? JSON.parse(messages) : [];
};

export const saveProjectMessages = async (id, messages) => {
  if (!window.puter) return;
  // Limit messages to avoid exceeding KV size limits if necessary
  await window.puter.kv.set(`onyx_messages_${id}`, JSON.stringify(messages));
};

export const saveGitHubToken = async (token) => {
  if (!window.puter) return;
  await window.puter.kv.set('github_token', token);
};

export const getGitHubToken = async () => {
  if (!window.puter) return null;
  return await window.puter.kv.get('github_token');
};
