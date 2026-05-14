import { Octokit } from "@octokit/rest";
import type { GitHubClient, TreeEntry, PullRequestInput } from "./github";

class OctokitGitHubClient implements GitHubClient {
  constructor(
    private octokit: Octokit,
    private owner: string,
    private repo: string,
  ) {}

  async getDefaultBranch() {
    const { data: repo } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });
    const { data: ref } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${repo.default_branch}`,
    });
    return { sha: ref.object.sha, name: repo.default_branch };
  }

  async createBranch(name: string, sha: string) {
    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${name}`,
      sha,
    });
  }

  async createTree(tree: TreeEntry[], baseSha: string) {
    const { data } = await this.octokit.git.createTree({
      owner: this.owner,
      repo: this.repo,
      tree,
      base_tree: baseSha,
    });
    return data.sha;
  }

  async createCommit(message: string, treeSha: string, parentSha: string) {
    const { data } = await this.octokit.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message,
      tree: treeSha,
      parents: [parentSha],
    });
    return data.sha;
  }

  async updateRef(ref: string, sha: string) {
    await this.octokit.git.updateRef({
      owner: this.owner,
      repo: this.repo,
      ref,
      sha,
    });
  }

  async createPullRequest(pr: PullRequestInput) {
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: pr.title,
      head: pr.head,
      base: pr.base,
      body: pr.body,
    });
    return { url: data.html_url, number: data.number };
  }

  async treeExists(path: string, branchName: string): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: branchName,
      });
      return true;
    } catch (err: any) {
      if (err.status === 404) return false;
      throw err;
    }
  }

  async getDirectoryTree(path: string, branchName: string): Promise<Map<string, string>> {
    const { data } = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: branchName,
      recursive: "1",
    });

    const prefix = path.endsWith("/") ? path : path + "/";
    const result = new Map<string, string>();

    for (const entry of data.tree) {
      if (entry.type === "blob" && entry.path && entry.sha && entry.path.startsWith(prefix)) {
        const relativePath = entry.path.slice(prefix.length);
        result.set(relativePath, entry.sha);
      }
    }

    return result;
  }
}

export function createOctokitClient(): GitHubClient {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }
  const owner = process.env.GITHUB_OWNER || "TreeTreeDi";
  const repo = process.env.GITHUB_REPO || "skills-data";
  const octokit = new Octokit({ auth: token });
  return new OctokitGitHubClient(octokit, owner, repo);
}
