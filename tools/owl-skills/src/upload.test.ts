import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { validateUploadDir, inferPackageName } from "./upload.ts";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("inferPackageName", () => {
  it("infers name from folder path", () => {
    expect(inferPackageName("/Users/me/my-skills")).toBe("my-skills");
  });

  it("infers name from nested path", () => {
    expect(inferPackageName("/Users/me/projects/code-review")).toBe("code-review");
  });

  it("infers name from dot-separated name", () => {
    expect(inferPackageName("/Users/me/my.cool.skill")).toBe("my.cool.skill");
  });
});

describe("validateUploadDir", () => {
  const testDir = join(tmpdir(), "owl-skills-test-upload");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns error when directory does not exist", async () => {
    const result = await validateUploadDir("/nonexistent/path");
    if (result.valid) throw new Error("expected invalid");
    expect(result.error).toContain("does not exist");
  });

  it("returns error when no SKILL.md exists anywhere", async () => {
    const dir = join(testDir, "no-skill");
    mkdirSync(dir);
    const result = await validateUploadDir(dir);
    if (result.valid) throw new Error("expected invalid");
    expect(result.error).toContain("No valid skills found");
  });

  it("validates Kit package with skills in subdirectories", async () => {
    const dir = join(testDir, "my-kit");
    mkdirSync(dir);
    const sub1 = join(dir, "skill-a");
    mkdirSync(sub1);
    writeFileSync(
      join(sub1, "SKILL.md"),
      `---
name: skill-a
description: First skill
---
`,
    );
    const sub2 = join(dir, "skill-b");
    mkdirSync(sub2);
    writeFileSync(
      join(sub2, "SKILL.md"),
      `---
name: skill-b
description: Second skill
---
`,
    );
    const result = await validateUploadDir(dir);
    if (!result.valid) throw new Error(`expected valid: ${result.error}`);
    expect(result.packageName).toBe("my-kit");
    expect(result.skills.length).toBe(2);
    const names = result.skills.map((s) => s.name);
    expect(names).toContain("skill-a");
    expect(names).toContain("skill-b");
  });

  it("returns error when SKILL.md has no name", async () => {
    const dir = join(testDir, "no-name");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\ndescription: test\n---\n");
    const result = await validateUploadDir(dir);
    if (result.valid) throw new Error("expected invalid");
    expect(result.error).toContain("name");
  });

  it("returns error when SKILL.md has no description", async () => {
    const dir = join(testDir, "no-desc");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\nname: test\n---\n");
    const result = await validateUploadDir(dir);
    if (result.valid) throw new Error("expected invalid");
    expect(result.error).toContain("description");
  });

  it("returns error when SKILL.md has invalid YAML", async () => {
    const dir = join(testDir, "bad-yaml");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "---\n: invalid: yaml: [[\n---\n");
    const result = await validateUploadDir(dir);
    expect(result.valid).toBe(false);
  });

  it("returns error when SKILL.md has no frontmatter", async () => {
    const dir = join(testDir, "no-frontmatter");
    mkdirSync(dir);
    writeFileSync(join(dir, "SKILL.md"), "# Just a markdown file\n");
    const result = await validateUploadDir(dir);
    if (result.valid) throw new Error("expected invalid");
    expect(result.error).toContain("frontmatter");
  });

  it("returns success with package name and skills for valid directory", async () => {
    const dir = join(testDir, "my-skills");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "SKILL.md"),
      `---
name: my-skill
description: A cool skill
---
# My Skill
`,
    );
    const result = await validateUploadDir(dir);
    if (!result.valid) throw new Error(`expected valid: ${result.error}`);
    expect(result.packageName).toBe("my-skills");
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.name).toBe("my-skill");
    expect(result.skills[0]!.description).toBe("A cool skill");
  });

  it("discovers multiple skills in subdirectories", async () => {
    const dir = join(testDir, "skill-pack");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "SKILL.md"),
      `---
name: skill-pack
description: A pack of skills
---
`,
    );
    const sub1 = join(dir, "skill-a");
    mkdirSync(sub1);
    writeFileSync(
      join(sub1, "SKILL.md"),
      `---
name: skill-a
description: First skill
---
`,
    );
    const sub2 = join(dir, "skill-b");
    mkdirSync(sub2);
    writeFileSync(
      join(sub2, "SKILL.md"),
      `---
name: skill-b
description: Second skill
---
`,
    );
    const result = await validateUploadDir(dir);
    if (!result.valid) throw new Error(`expected valid: ${result.error}`);
    expect(result.skills.length).toBeGreaterThanOrEqual(2);
    const names = result.skills.map((s) => s.name);
    expect(names).toContain("skill-a");
    expect(names).toContain("skill-b");
  });
});
