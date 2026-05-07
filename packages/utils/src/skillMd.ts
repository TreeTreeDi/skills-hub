import { parse as parseYaml } from "yaml";

interface SkillMdSuccess {
  name: string;
  description: string;
  body: string;
}

interface SkillMdError {
  error: string;
}

export type SkillMdResult = SkillMdSuccess | SkillMdError;

interface ValidateSuccess {
  valid: true;
}

interface ValidateError {
  valid: false;
  error: string;
}

export type ValidationResult = ValidateSuccess | ValidateError;

function extractFrontmatter(content: string): { frontmatter: string; body: string } | null {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n?([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1]!, body: (match[2] ?? "").replace(/^\n/, "") };
}

export function parseSkillMd(content: string): SkillMdResult {
  const extracted = extractFrontmatter(content);
  if (!extracted) {
    return { error: "Missing YAML frontmatter" };
  }

  let data: Record<string, unknown>;
  try {
    data = parseYaml(extracted.frontmatter) ?? {};
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
    body: extracted.body,
  };
}

export function validateSkillMd(content: string): ValidationResult {
  const result = parseSkillMd(content);
  if ("error" in result) {
    return { valid: false, error: result.error };
  }
  return { valid: true };
}
