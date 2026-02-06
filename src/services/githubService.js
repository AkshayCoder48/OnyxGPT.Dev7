/**
 * GitHub API service for OnyxGPT.dev
 * Handles repository creation and code pushing using the stored GitHub token.
 */
import { getGitHubToken } from './storage';

const GITHUB_API_BASE = 'https://api.github.com';

async function getHeaders() {
  const token = await getGitHubToken();
  if (!token) throw new Error('GitHub token not found. Please connect your GitHub account.');

  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export async function getUser() {
  const headers = await getHeaders();
  const response = await fetch(`${GITHUB_API_BASE}/user`, { headers });
  if (!response.ok) throw new Error('Failed to fetch GitHub user');
  return await response.json();
}

export async function createRepository(name, description = '', isPrivate = false) {
  const headers = await getHeaders();
  const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create repository');
  }

  return await response.json();
}

export async function pushFiles(owner, repo, branch, files) {
  const headers = await getHeaders();

  // 1. Ensure target branch exists (retry if repo was just created)
  let targetBranch = branch || 'main';
  let branchData = null;
  let attempts = 0;

  while (attempts < 5) {
    const branchResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${targetBranch}`, { headers });
    if (branchResponse.ok) {
      branchData = await branchResponse.json();
      break;
    }
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!branchData) {
    throw new Error(`Failed to find branch ${targetBranch}. The repository might still be initializing.`);
  }

  const baseTreeSha = branchData.commit.commit.tree.sha;
  const parentCommitSha = branchData.commit.sha;

  // 2. Create blobs for each file
  const tree = [];
  for (const file of files) {
    const blobResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: file.content,
        encoding: 'utf-8',
      }),
    });
    if (!blobResponse.ok) throw new Error(`Failed to create blob for ${file.path}`);
    const blobData = await blobResponse.json();
    tree.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 3. Create a new tree
  const treeResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree,
    }),
  });
  if (!treeResponse.ok) throw new Error('Failed to create tree');
  const treeData = await treeResponse.json();

  // 4. Create a new commit
  const commitResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Update files via OnyxGPT',
      tree: treeData.sha,
      parents: [parentCommitSha],
    }),
  });
  if (!commitResponse.ok) throw new Error('Failed to create commit');
  const commitData = await commitResponse.json();

  // 5. Update the branch reference
  const refResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: commitData.sha,
    }),
  });
  if (!refResponse.ok) throw new Error('Failed to update branch reference');

  return await refResponse.json();
}
