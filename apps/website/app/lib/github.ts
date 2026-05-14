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
  treeExists(path: string, branchName: string): Promise<boolean>;
  getDirectoryTree(path: string, branchName: string): Promise<Map<string, string>>;
}

export type SubmitMode = "upload" | "amend";

export interface PackagePRInput {
  mode: SubmitMode;
  packageName: string;
  uploaderName: string;
  uploaderEmail: string;
  category: string;
  tags: string[];
  textFiles: Map<string, string>;
  skills: Array<{ name: string; description: string }>;
  addedPaths?: string[];
  modifiedPaths?: string[];
}

export async function createPackagePR(
  options: PackagePRInput,
  github: GitHubClient,
): Promise<{ prUrl: string; prNumber: number }> {
  const branchPrefix = options.mode === "amend" ? "amend" : "upload";
  const branchName = `${branchPrefix}/${options.packageName}-${Date.now()}`;

  const { sha: baseSha, name: defaultBranch } = await github.getDefaultBranch();

  await github.createBranch(branchName, baseSha);

  const treeEntries: TreeEntry[] = [];
  for (const [path, content] of options.textFiles) {
    treeEntries.push({
      path: `skills/${options.packageName}/${path}`,
      mode: "100644",
      type: "blob",
      content,
    });
  }

  const treeSha = await github.createTree(treeEntries, baseSha);

  const skillsList = options.skills.map((s) => `- **${s.name}**: ${s.description}`).join("\n");

  const verb = options.mode === "amend" ? "Update" : "Add";
  const commitSha = await github.createCommit(
    `📦 ${verb} skill package: ${options.packageName}\n\nUploaded by: ${options.uploaderName} <${options.uploaderEmail}>`,
    treeSha,
    baseSha,
  );

  await github.updateRef(`heads/${branchName}`, commitSha);

  const prTitle =
    options.mode === "amend"
      ? `📦 Update package: ${options.packageName}`
      : `📦 New Package: ${options.packageName}`;

  const prBody =
    options.mode === "amend"
      ? buildAmendBody(options, skillsList)
      : buildUploadBody(options, skillsList);

  const pr = await github.createPullRequest({
    title: prTitle,
    head: branchName,
    base: defaultBranch,
    body: prBody,
  });

  return { prUrl: pr.url, prNumber: pr.number };
}

function buildUploadBody(options: PackagePRInput, skillsList: string): string {
  return `## New Skill Package

**Package:** ${options.packageName}
**Category:** ${options.category}
**Tags:** ${options.tags.join(", ") || "none"}

### Uploaded by
${options.uploaderName} <${options.uploaderEmail}>

### Skills included
${skillsList}

---
*Uploaded via owl-skills CLI*`;
}

function buildAmendBody(options: PackagePRInput, skillsList: string): string {
  const addedList =
    options.addedPaths && options.addedPaths.length > 0
      ? `**Added (${options.addedPaths.length} file${options.addedPaths.length > 1 ? "s" : ""}):**\n${options.addedPaths.map((p) => `- \`${p}\``).join("\n")}`
      : "";
  const modifiedList =
    options.modifiedPaths && options.modifiedPaths.length > 0
      ? `**Modified (${options.modifiedPaths.length} file${options.modifiedPaths.length > 1 ? "s" : ""}):**\n${options.modifiedPaths.map((p) => `- \`${p}\``).join("\n")}`
      : "";

  const changeSummary = [addedList, modifiedList].filter(Boolean).join("\n\n");

  return `## Update Package: ${options.packageName}

**Category:** ${options.category}
**Tags:** ${options.tags.join(", ") || "none"}

### Uploaded by
${options.uploaderName} <${options.uploaderEmail}>

### Changes
${changeSummary}

### Skills included
${skillsList}

---
*Updated via owl-skills CLI*`;
}

export function isBinary(buffer: Buffer): boolean {
  const check = buffer.subarray(0, Math.min(8192, buffer.length));
  for (let i = 0; i < check.length; i++) {
    if (check[i] === 0) return true;
  }
  return false;
}
