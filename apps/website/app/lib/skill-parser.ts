import { parseSkillMd } from "utils";

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
        const result = parseSkillMd(content.toString("utf-8"));
        if ("error" in result) {
          errors.push(`${path}: ${result.error}`);
        }
      }
    }
  }

  if (!hasSkillMd) {
    errors.push("No SKILL.md found in the package");
  }

  return { valid: errors.length === 0, errors, skills };
}
