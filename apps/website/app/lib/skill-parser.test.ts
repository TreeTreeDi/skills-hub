import { describe, it, expect } from "vitest";
import { parseSkillMd, validatePackageStructure } from "./skill-parser";

describe("parseSkillMd", () => {
  it("parses valid frontmatter", () => {
    const content = `---
name: my-skill
description: Does something useful
version: 1.0.0
tags:
  - testing
  - quality
---

# My Skill

Instructions here.`;

    const result = parseSkillMd(content);
    expect(result).not.toBeNull();
    expect(result!.frontmatter.name).toBe("my-skill");
    expect(result!.frontmatter.description).toBe("Does something useful");
    expect(result!.frontmatter.version).toBe("1.0.0");
    expect(result!.frontmatter.tags).toEqual(["testing", "quality"]);
    expect(result!.body).toBe("# My Skill\n\nInstructions here.");
  });

  it("parses allowed-tools (kebab-case)", () => {
    const content = `---
name: test
description: test skill
allowed-tools:
  - Bash
  - Read
---
body`;

    const result = parseSkillMd(content);
    expect(result!.frontmatter.allowedTools).toEqual(["Bash", "Read"]);
  });

  it("parses allowedTools (camelCase)", () => {
    const content = `---
name: test
description: test skill
allowedTools:
  - Bash
---
body`;

    const result = parseSkillMd(content);
    expect(result!.frontmatter.allowedTools).toEqual(["Bash"]);
  });

  it("returns null for missing frontmatter", () => {
    expect(parseSkillMd("# No frontmatter")).toBeNull();
  });

  it("returns null for invalid YAML", () => {
    expect(parseSkillMd("---\n{{invalid\n---\nbody")).toBeNull();
  });

  it("returns null when name is missing", () => {
    const content = `---
description: no name
---
body`;
    expect(parseSkillMd(content)).toBeNull();
  });

  it("returns null when description is missing", () => {
    const content = `---
name: no-desc
---
body`;
    expect(parseSkillMd(content)).toBeNull();
  });

  it("handles frontmatter with no body", () => {
    const content = `---
name: minimal
description: minimal skill
---`;

    const result = parseSkillMd(content);
    expect(result).not.toBeNull();
    expect(result!.body).toBe("");
  });
});

describe("validatePackageStructure", () => {
  it("validates a valid package", () => {
    const files = new Map<string, Buffer>([
      ["skill-a/SKILL.md", Buffer.from("---\nname: a\ndescription: test\n---\nbody")],
      ["skill-a/helper.ts", Buffer.from("export const x = 1")],
    ]);

    const result = validatePackageStructure(files);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.skills).toContain("skill-a");
  });

  it("rejects package with no SKILL.md", () => {
    const files = new Map<string, Buffer>([["README.md", Buffer.from("hello")]]);

    const result = validatePackageStructure(files);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("No SKILL.md found in the package");
  });

  it("reports invalid SKILL.md frontmatter", () => {
    const files = new Map<string, Buffer>([
      ["bad-skill/SKILL.md", Buffer.from("no frontmatter here")],
    ]);

    const result = validatePackageStructure(files);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("invalid frontmatter");
  });

  it("validates multiple skills", () => {
    const files = new Map<string, Buffer>([
      ["pkg/a/SKILL.md", Buffer.from("---\nname: a\ndescription: d\n---\nbody")],
      ["pkg/b/SKILL.md", Buffer.from("---\nname: b\ndescription: d\n---\nbody")],
    ]);

    const result = validatePackageStructure(files);
    expect(result.valid).toBe(true);
    expect(result.skills).toHaveLength(2);
  });
});
