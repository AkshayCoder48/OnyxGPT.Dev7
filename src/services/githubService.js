/**
 * GitHub API service for OnyxGPT.dev
 * Handles repository creation and code pushing using the stored GitHub token.
 * Uses window.puter.proxy to bypass CORS issues.
 */
import { getGitHubToken } from './storage';

const GITHUB_API_BASE = 'https://api.github.com';

function getUrl(path) {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;
  if (window.puter && window.puter.proxy) {
    return window.puter.proxy(url);
  }
  return url;
}

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
  const response = await fetch(getUrl('/user'), { headers });
  if (!response.ok) throw new Error('Failed to fetch GitHub user');
  return await response.json();
}

export async function createRepository(name, description = '', isPrivate = false) {
  const headers = await getHeaders();
  const response = await fetch(getUrl('/user/repos'), {
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

  let targetBranch = branch || 'main';
  let branchData = null;
  let attempts = 0;

  // Retry loop for new repositories
  while (attempts < 10) {
    const branchUrl = getUrl(`/repos/${owner}/${repo}/branches/${targetBranch}`);
    const branchResponse = await fetch(branchUrl, { headers });
    if (branchResponse.ok) {
      branchData = await branchResponse.json();
      break;
    }
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!branchData) {
    throw new Error(`Failed to find branch ${targetBranch}. Ensure the repository is initialized.`);
  }

  const baseTreeSha = branchData.commit.commit.tree.sha;
  const parentCommitSha = branchData.commit.sha;

  // 1. Create blobs
  const tree = [];
  for (const file of files) {
    const blobUrl = getUrl(`/repos/${owner}/${repo}/git/blobs`);
    const blobResponse = await fetch(blobUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: file.content,
        encoding: 'utf-8',
      }),
    });
    if (!blobResponse.ok) {
        const err = await blobResponse.json();
        throw new Error(`Failed to create blob for ${file.path}: ${err.message}`);
    }
    const blobData = await blobResponse.json();
    tree.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 2. Create tree
  const treeUrl = getUrl(`/repos/${owner}/${repo}/git/trees`);
  const treeResponse = await fetch(treeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree,
    }),
  });
  if (!treeResponse.ok) throw new Error('Failed to create tree');
  const treeData = await treeResponse.json();

  // 3. Create commit
  const commitUrl = getUrl(`/repos/${owner}/${repo}/git/commits`);
  const commitResponse = await fetch(commitUrl, {
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

  // 4. Update ref
  const refUrl = getUrl(`/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`);
  const refResponse = await fetch(refUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: commitData.sha,
    }),
  });
  if (!refResponse.ok) throw new Error('Failed to update branch reference');

  return await refResponse.json();
}
