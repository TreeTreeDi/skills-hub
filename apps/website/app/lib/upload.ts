import AdmZip from "adm-zip";
import { validatePackageStructure, parseSkillMd } from "./skill-parser";
import { createUploadPR, type GitHubClient } from "./github";
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

export interface UploadError {
  error: string;
  details?: string[];
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
    const parsed = parseSkillMd(buffer.toString("utf-8"));
    if (parsed) {
      skills.push({
        name: parsed.frontmatter.name,
        description: parsed.frontmatter.description,
      });
    }
  }

  return skills;
}

export async function processUpload(
  input: UploadInput,
  github?: GitHubClient,
): Promise<UploadResult | UploadError> {
  let files: Map<string, Buffer>;
  try {
    files = extractZip(input.fileBuffer);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to extract ZIP" };
  }

  const validation = validatePackageStructure(files);
  if (!validation.valid) {
    return { error: "Invalid package structure", details: validation.errors };
  }

  const skills = collectSkills(files);

  const client = github ?? createOctokitClient();
  const result = await createUploadPR(
    {
      packageName: input.packageName,
      uploaderName: input.uploaderName,
      uploaderEmail: input.uploaderEmail,
      category: input.category,
      tags: input.tags,
      files,
      skills,
    },
    client,
  );

  return { prUrl: result.prUrl, prNumber: result.prNumber, skills };
}
