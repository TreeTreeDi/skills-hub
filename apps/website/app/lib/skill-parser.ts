import { parse as parseYaml } from "yaml";

export interface SkillFrontmatter {
  name: string;
  description: string;
  version?: string;
  tags?: string[];
  allowedTools?: string[];
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
  raw: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export function parseSkillMd(content: string): ParsedSkill | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;

  const yamlStr = match[1];
  const body = content.slice(match[0].length).trim();
  let frontmatter: Record<string, unknown>;

  try {
    frontmatter = parseYaml(yamlStr) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (typeof frontmatter.name !== "string" || typeof frontmatter.description !== "string") {
    return null;
  }

  return {
    frontmatter: {
      name: frontmatter.name,
      description: frontmatter.description,
      version: typeof frontmatter.version === "string" ? frontmatter.version : undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : undefined,
      allowedTools: Array.isArray(frontmatter["allowed-tools"])
        ? (frontmatter["allowed-tools"] as unknown[]).map(String)
        : Array.isArray(frontmatter.allowedTools)
          ? (frontmatter.allowedTools as unknown[]).map(String)
          : undefined,
    },
    body,
    raw: content,
  };
}

export function validatePackageStructure(files: Map<string, Buffer>): {
  valid: boolean;
  errors: string[];
  skills: string[];
} {
  const errors: string[] = [];
  const skills: string[] = [];

  let hasSkillMd = false;

  for (const [path] of files) {
    if (path.endsWith("SKILL.md")) {
      hasSkillMd = true;
      const dir = path.substring(0, path.lastIndexOf("/"));
      const skillName = dir.split("/").pop() || dir;
      skills.push(skillName);

      const content = files.get(path);
      if (content) {
        const parsed = parseSkillMd(content.toString("utf-8"));
        if (!parsed) {
          errors.push(`${path}: invalid frontmatter (requires name and description)`);
        }
      }
    }
  }

  if (!hasSkillMd) {
    errors.push("No SKILL.md found in the package");
  }

  return { valid: errors.length === 0, errors, skills };
}
