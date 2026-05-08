import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { __internal, validateSkillSource } from "./skills";

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "skills-hub-website-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("collectSkillDescriptors", () => {
  it("detects single skill packages and kit packages from skills/", () => {
    const descriptors = __internal.collectSkillDescriptors([
      { path: "skills/single/SKILL.md", size: 10 },
      { path: "skills/kit/skill-a/SKILL.md", size: 10 },
      { path: "skills/kit/skill-a/helper.ts", size: 5 },
      { path: "skills/kit/skill-b/SKILL.md", size: 10 },
    ]);

    expect(descriptors.map((descriptor) => descriptor.skillMdPath)).toEqual([
      "skills/kit/skill-a/SKILL.md",
      "skills/kit/skill-b/SKILL.md",
      "skills/single/SKILL.md",
    ]);
    expect(descriptors[0]?.packageName).toBe("kit");
    expect(descriptors[0]?.category).toBe("集成包");
    expect(descriptors[2]?.packageName).toBe("single");
    expect(descriptors[2]?.category).toBe("单技能");
  });

  it("treats nested single-skill packages as integration packages", () => {
    const descriptors = __internal.collectSkillDescriptors([
      { path: "skills/kit/skill-a/SKILL.md", size: 10 },
    ]);

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]?.packageName).toBe("kit");
    expect(descriptors[0]?.category).toBe("集成包");
  });
});

describe("loadSkillsFromLocalPackages", () => {
  it("loads a single skill package from skills/", async () => {
    const rootDir = await createTempDir();
    const packageDir = join(rootDir, "single");
    await mkdir(packageDir, { recursive: true });
    await writeFile(
      join(packageDir, "SKILL.md"),
      "---\nname: single\ndescription: Single skill\n---\n",
    );

    const skills = await __internal.loadSkillsFromLocalPackages(rootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      slug: "single-single",
      name: "single",
      category: "单技能",
      packageName: "single",
    });
  });

  it("loads all skills from a kit package", async () => {
    const rootDir = await createTempDir();
    const kitDir = join(rootDir, "kit");
    await mkdir(join(kitDir, "skill-a"), { recursive: true });
    await mkdir(join(kitDir, "skill-b"), { recursive: true });
    await writeFile(
      join(kitDir, "skill-a", "SKILL.md"),
      "---\nname: skill-a\ndescription: Skill A\n---\n",
    );
    await writeFile(
      join(kitDir, "skill-b", "SKILL.md"),
      "---\nname: skill-b\ndescription: Skill B\n---\n",
    );

    const skills = await __internal.loadSkillsFromLocalPackages(rootDir);

    expect(skills).toHaveLength(2);
    expect(skills.map((skill) => skill.name)).toEqual(["skill-a", "skill-b"]);
    expect(skills.every((skill) => skill.packageName === "kit")).toBe(true);
    expect(skills.every((skill) => skill.category === "集成包")).toBe(true);
  });
});

describe("groupPackages", () => {
  it("aggregates kit skills into one package card", async () => {
    const rootDir = await createTempDir();
    const kitDir = join(rootDir, "kit");
    await mkdir(join(kitDir, "skill-a"), { recursive: true });
    await mkdir(join(kitDir, "skill-b"), { recursive: true });
    await writeFile(
      join(kitDir, "skill-a", "SKILL.md"),
      "---\nname: skill-a\ndescription: Skill A\n---\n",
    );
    await writeFile(
      join(kitDir, "skill-b", "SKILL.md"),
      "---\nname: skill-b\ndescription: Skill B\n---\n",
    );

    const skills = await __internal.loadSkillsFromLocalPackages(rootDir);
    const packages = __internal.groupPackages(skills);

    expect(packages).toHaveLength(1);
    expect(packages[0]).toMatchObject({
      slug: "kit",
      name: "kit",
      category: "集成包",
      packageName: "kit",
    });
    expect(packages[0]?.skills).toHaveLength(2);
  });
});

describe("loadSkillsFromDefaultRepo", () => {
  it("reads skills from the default repo tree, including kit packages", async () => {
    const skills = await __internal.loadSkillsFromDefaultRepo({
      async listFiles() {
        return [
          { path: "skills/kit/skill-a/SKILL.md", size: 10, sha: "a" },
          { path: "skills/kit/skill-a/helper.ts", size: 3, sha: "b" },
          { path: "skills/single/SKILL.md", size: 10, sha: "c" },
        ];
      },
      async readTextFile(path: string) {
        if (path === "skills/kit/skill-a/SKILL.md") {
          return "---\nname: skill-a\ndescription: Skill A\n---\n";
        }

        return "---\nname: single\ndescription: Single skill\n---\n";
      },
    });

    expect(skills).toHaveLength(2);
    expect(skills.map((skill) => skill.packageName)).toEqual(["kit", "single"]);
    expect(skills[0]?.fileList.length).toBeGreaterThan(0);
  });
});

describe("validateSkillSource", () => {
  it("reports invalid skills in skills/", async () => {
    const rootDir = await createTempDir();
    const invalidDir = join(rootDir, "broken");
    await mkdir(invalidDir, { recursive: true });
    await writeFile(join(invalidDir, "SKILL.md"), "---\nname: broken\n---\n");

    const result = await validateSkillSource(rootDir);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("No valid skills found");
  });
});
