import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { discoverSkills } from "./skills.ts";
import type { Skill } from "./types.ts";

interface SkillMdSuccess {
  name: string;
  description: string;
  body: string;
}

interface SkillMdError {
  error: string;
}

type SkillMdResult = SkillMdSuccess | SkillMdError;

function parseSkillMd(content: string): SkillMdResult {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n?([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { error: "Missing YAML frontmatter" };
  }
  const frontmatter = match[1]!;
  const body = (match[2] ?? "").replace(/^\n/, "");

  let data: Record<string, unknown>;
  try {
    data = parseYaml(frontmatter) ?? {};
  } catch {
    return { error: "Invalid YAML frontmatter" };
  }

  if (typeof data.name !== "string") {
    if (data.name === undefined || data.name === null) {
      return { error: "Missing required field: name" };
    }
    return { error: "Field 'name' must be a string" };
  }

  if (typeof data.description !== "string") {
    if (data.description === undefined || data.description === null) {
      return { error: "Missing required field: description" };
    }
    return { error: "Field 'description' must be a string" };
  }

  return {
    name: data.name,
    description: data.description,
    body,
  };
}

interface UploadValidationSuccess {
  valid: true;
  packageName: string;
  skills: Skill[];
}

interface UploadValidationError {
  valid: false;
  error: string;
}

export type UploadValidationResult = UploadValidationSuccess | UploadValidationError;

export function inferPackageName(dirPath: string): string {
  return basename(dirPath);
}

export async function validateUploadDir(dirPath: string): Promise<UploadValidationResult> {
  if (!existsSync(dirPath)) {
    return { valid: false, error: `Directory does not exist: ${dirPath}` };
  }

  const skillMdPath = join(dirPath, "SKILL.md");
  if (existsSync(skillMdPath)) {
    const content = await readFile(skillMdPath, "utf-8");
    const parsed = parseSkillMd(content);
    if ("error" in parsed) {
      return { valid: false, error: `Invalid SKILL.md: ${parsed.error}` };
    }
  }

  const skills = await discoverSkills(dirPath, undefined, { fullDepth: true });
  if (skills.length === 0) {
    return { valid: false, error: "No valid skills found" };
  }

  return {
    valid: true,
    packageName: inferPackageName(dirPath),
    skills,
  };
}
