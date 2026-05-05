export interface TreeEntry {
  path: string;
  mode: "100644";
  type: "blob";
  content: string;
}

export interface PullRequestInput {
  title: string;
  head: string;
  base: string;
  body: string;
}

export interface GitHubClient {
  getDefaultBranch(): Promise<{ sha: string; name: string }>;
  createBranch(name: string, sha: string): Promise<void>;
  createTree(tree: TreeEntry[], baseSha: string): Promise<string>;
  createCommit(message: string, treeSha: string, parentSha: string): Promise<string>;
  updateRef(ref: string, sha: string): Promise<void>;
  createPullRequest(pr: PullRequestInput): Promise<{ url: string; number: number }>;
}

export interface UploadPRInput {
  packageName: string;
  uploaderName: string;
  uploaderEmail: string;
  category: string;
  tags: string[];
  files: Map<string, Buffer>;
  skills: Array<{ name: string; description: string }>;
}

export async function createUploadPR(
  options: UploadPRInput,
  github: GitHubClient,
): Promise<{ prUrl: string; prNumber: number }> {
  const branchName = `upload/${options.packageName}-${Date.now()}`;

  const { sha: baseSha, name: defaultBranch } = await github.getDefaultBranch();

  await github.createBranch(branchName, baseSha);

  const treeEntries: TreeEntry[] = [];
  for (const [path, buffer] of options.files) {
    if (isBinary(buffer)) continue;
    treeEntries.push({
      path: `skills/${options.packageName}/${path}`,
      mode: "100644",
      type: "blob",
      content: buffer.toString("utf-8"),
    });
  }

  const treeSha = await github.createTree(treeEntries, baseSha);

  const skillsList = options.skills.map((s) => `- **${s.name}**: ${s.description}`).join("\n");

  const commitSha = await github.createCommit(
    `📦 Add skill package: ${options.packageName}\n\nUploaded by: ${options.uploaderName} <${options.uploaderEmail}>`,
    treeSha,
    baseSha,
  );

  await github.updateRef(`heads/${branchName}`, commitSha);

  const pr = await github.createPullRequest({
    title: `📦 New Package: ${options.packageName}`,
    head: branchName,
    base: defaultBranch,
    body: `## New Skill Package

**Package:** ${options.packageName}
**Category:** ${options.category}
**Tags:** ${options.tags.join(", ") || "none"}

### Uploaded by
${options.uploaderName} <${options.uploaderEmail}>

### Skills included
${skillsList}

---
*Uploaded via owl-skills CLI*`,
  });

  return { prUrl: pr.url, prNumber: pr.number };
}

function isBinary(buffer: Buffer): boolean {
  const check = buffer.subarray(0, Math.min(8192, buffer.length));
  for (let i = 0; i < check.length; i++) {
    if (check[i] === 0) return true;
  }
  return false;
}
