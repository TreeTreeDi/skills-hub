import { createHash } from "crypto";
import AdmZip from "adm-zip";
import { parseSkillMd } from "utils";
import { validatePackageStructure } from "./skill-parser";
import { createPackagePR, isBinary, type GitHubClient, type SubmitMode } from "./github";
import { createOctokitClient } from "./github-octokit";

export interface UploadInput {
  fileBuffer: Buffer;
  packageName: string;
  uploaderName: string;
  uploaderEmail: string;
  category: string;
  tags: string[];
}

export interface UploadResult {
  prUrl: string;
  prNumber: number;
  skills: Array<{ name: string; description: string }>;
}

export type UploadError =
  | { type: "EXTRACTION_FAILED"; message: string }
  | { type: "INVALID_STRUCTURE"; details: string[] }
  | { type: "DUPLICATE_PACKAGE"; packageName: string };

export type AmendError =
  | { type: "EXTRACTION_FAILED"; message: string }
  | { type: "INVALID_STRUCTURE"; details: string[] }
  | { type: "PACKAGE_NOT_FOUND"; packageName: string }
  | { type: "NO_CHANGES"; packageName: string };

export interface AmendResult {
  prUrl: string;
  prNumber: number;
  skills: Array<{ name: string; description: string }>;
  addedPaths: string[];
  modifiedPaths: string[];
}

export function computeGitBlobSha(content: Buffer): string {
  const header = `blob ${content.length}\0`;
  return createHash("sha1").update(header).update(content).digest("hex");
}

export function extractZip(buffer: Buffer): Map<string, Buffer> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const topDirs = new Set<string>();
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const slash = entry.entryName.indexOf("/");
    if (slash > 0) {
      topDirs.add(entry.entryName.substring(0, slash));
    }
  }

  if (topDirs.size !== 1) {
    throw new Error(
      `ZIP must contain exactly one top-level directory, found: ${
        topDirs.size === 0 ? "none" : [...topDirs].join(", ")
      }`,
    );
  }

  const prefix = [...topDirs][0] + "/";
  const files = new Map<string, Buffer>();

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const path = entry.entryName.startsWith(prefix)
      ? entry.entryName.slice(prefix.length)
      : entry.entryName;
    if (path) {
      files.set(path, entry.getData());
    }
  }

  return files;
}

export function parseTags(raw: string): string[] | null {
  try {
    const tags = JSON.parse(raw);
    if (!Array.isArray(tags)) return null;
    return tags.map(String);
  } catch {
    return null;
  }
}

export function collectSkills(
  files: Map<string, Buffer>,
): Array<{ name: string; description: string }> {
  const skills: Array<{ name: string; description: string }> = [];

  for (const [path, buffer] of files) {
    if (!path.endsWith("SKILL.md")) continue;
    const result = parseSkillMd(buffer.toString("utf-8"));
    if (!("error" in result)) {
      skills.push({
        name: result.name,
        description: result.description,
      });
    }
  }

  return skills;
}

export interface PreparedUpload {
  files: Map<string, Buffer>;
  skills: Array<{ name: string; description: string }>;
}

export function prepareUpload(buffer: Buffer): PreparedUpload | UploadError {
  let files: Map<string, Buffer>;
  try {
    files = extractZip(buffer);
  } catch (e) {
    return {
      type: "EXTRACTION_FAILED",
      message: e instanceof Error ? e.message : "Failed to extract ZIP",
    };
  }

  const validation = validatePackageStructure(files);
  if (!validation.valid) {
    return { type: "INVALID_STRUCTURE", details: validation.errors };
  }

  const skills = collectSkills(files);
  return { files, skills };
}

function filterTextFiles(files: Map<string, Buffer>): Map<string, string> {
  const textFiles = new Map<string, string>();
  for (const [path, buffer] of files) {
    if (isBinary(buffer)) continue;
    textFiles.set(path, buffer.toString("utf-8"));
  }
  return textFiles;
}

async function submitPackage(
  mode: SubmitMode,
  input: UploadInput,
  github?: GitHubClient,
): Promise<UploadResult | AmendResult | UploadError | AmendError> {
  const prepared = prepareUpload(input.fileBuffer);
  if ("type" in prepared) return prepared;

  const client = github ?? createOctokitClient();

  const { name: defaultBranch } = await client.getDefaultBranch();
  const packagePath = `skills/${input.packageName}`;
  const exists = await client.treeExists(packagePath, defaultBranch);

  if (mode === "upload" && exists) {
    return { type: "DUPLICATE_PACKAGE", packageName: input.packageName };
  }
  if (mode === "amend" && !exists) {
    return { type: "PACKAGE_NOT_FOUND", packageName: input.packageName };
  }

  if (mode === "amend") {
    const remoteTree = await client.getDirectoryTree(packagePath, defaultBranch);

    const addedPaths: string[] = [];
    const modifiedPaths: string[] = [];
    const changedFiles = new Map<string, string>();

    for (const [path, buffer] of prepared.files) {
      if (isBinary(buffer)) continue;

      const localSha = computeGitBlobSha(buffer);
      const remoteSha = remoteTree.get(path);

      if (!remoteSha) {
        addedPaths.push(path);
        changedFiles.set(path, buffer.toString("utf-8"));
      } else if (localSha !== remoteSha) {
        modifiedPaths.push(path);
        changedFiles.set(path, buffer.toString("utf-8"));
      }
    }

    if (changedFiles.size === 0) {
      return { type: "NO_CHANGES", packageName: input.packageName };
    }

    const result = await createPackagePR(
      {
        mode: "amend",
        packageName: input.packageName,
        uploaderName: input.uploaderName,
        uploaderEmail: input.uploaderEmail,
        category: input.category,
        tags: input.tags,
        textFiles: changedFiles,
        addedPaths,
        modifiedPaths,
        skills: prepared.skills,
      },
      client,
    );

    return {
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      skills: prepared.skills,
      addedPaths,
      modifiedPaths,
    };
  }

  // upload mode
  const textFiles = filterTextFiles(prepared.files);

  const result = await createPackagePR(
    {
      mode: "upload",
      packageName: input.packageName,
      uploaderName: input.uploaderName,
      uploaderEmail: input.uploaderEmail,
      category: input.category,
      tags: input.tags,
      textFiles,
      skills: prepared.skills,
    },
    client,
  );

  return { prUrl: result.prUrl, prNumber: result.prNumber, skills: prepared.skills };
}

export async function processUpload(
  input: UploadInput,
  github?: GitHubClient,
): Promise<UploadResult | UploadError> {
  const result = await submitPackage("upload", input, github);
  if ("type" in result) return result as UploadError;
  return result as UploadResult;
}

export async function processAmend(
  input: UploadInput,
  github?: GitHubClient,
): Promise<AmendResult | AmendError> {
  const result = await submitPackage("amend", input, github);
  if ("type" in result) return result as AmendError;
  return result as AmendResult;
}