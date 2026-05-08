import { describe, it, expect } from "vitest";
import { validatePackageStructure } from "./skill-parser";

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
    expect(result.errors[0]).toContain("Missing YAML frontmatter");
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
