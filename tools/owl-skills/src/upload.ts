import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseSkillMd } from "utils";
import { discoverSkills } from "./skills.ts";
import type { Skill } from "./types.ts";

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
  if (!existsSync(skillMdPath)) {
    return { valid: false, error: "Missing SKILL.md in directory root" };
  }

  const content = await readFile(skillMdPath, "utf-8");
  const parsed = parseSkillMd(content);
  if ("error" in parsed) {
    return { valid: false, error: `Invalid SKILL.md: ${parsed.error}` };
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
