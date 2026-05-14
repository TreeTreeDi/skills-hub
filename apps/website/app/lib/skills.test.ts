import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "./prisma";
import {
  __internal,
  validateSkillSource,
  getSkillSlugs,
  getSkillBySlug,
  getPackageSlugs,
  getPackageBySlug,
} from "./skills";

vi.mock("./prisma", () => ({
  prisma: {
    skill: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    package: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const mockedPrisma = vi.mocked(prisma);

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

describe("getSkillSlugs", () => {
  beforeEach(() => {
    vi.mocked(mockedPrisma.skill.findMany).mockReset();
  });

  it("returns all skill slugs from the database", async () => {
    vi.mocked(mockedPrisma.skill.findMany).mockResolvedValue([
      { slug: "pkg--skill-a" },
      { slug: "pkg--skill-b" },
    ] as unknown as Awaited<ReturnType<typeof mockedPrisma.skill.findMany>>);

    const slugs = await getSkillSlugs();

    expect(slugs).toEqual(["pkg--skill-a", "pkg--skill-b"]);
    expect(mockedPrisma.skill.findMany).toHaveBeenCalledWith({
      select: { slug: true },
    });
  });
});

describe("getPackageSlugs", () => {
  beforeEach(() => {
    vi.mocked(mockedPrisma.package.findMany).mockReset();
  });

  it("returns all package slugs from the database", async () => {
    vi.mocked(mockedPrisma.package.findMany).mockResolvedValue([
      { slug: "pkg-a" },
      { slug: "pkg-b" },
    ] as unknown as Awaited<ReturnType<typeof mockedPrisma.package.findMany>>);

    const slugs = await getPackageSlugs();

    expect(slugs).toEqual(["pkg-a", "pkg-b"]);
    expect(mockedPrisma.package.findMany).toHaveBeenCalledWith({
      select: { slug: true },
    });
  });
});

describe("getSkillBySlug", () => {
  beforeEach(() => {
    vi.mocked(mockedPrisma.skill.findUnique).mockReset();
    vi.mocked(mockedPrisma.skill.findMany).mockReset();
  });

  it("returns null when skill is not found", async () => {
    vi.mocked(mockedPrisma.skill.findUnique).mockResolvedValue(null);

    const skill = await getSkillBySlug("nonexistent");

    expect(skill).toBeNull();
    expect(mockedPrisma.skill.findUnique).toHaveBeenCalledWith({
      where: { slug: "nonexistent" },
      include: { package: true },
    });
  });

  it("returns skill detail with related skills from the same package", async () => {
    const mockSkill = {
      id: "skill-1",
      slug: "pkg--skill-a",
      name: "Skill A",
      description: "Description A",
      category: "集成包",
      tags: ["tag1"],
      packageId: "pkg-1",
      package: { name: "pkg" },
      fileList: [{ path: "SKILL.md", language: "markdown", size: 100 }],
      skillMdBody: "Body A",
    };

    vi.mocked(mockedPrisma.skill.findUnique).mockResolvedValue(
      mockSkill as unknown as Awaited<ReturnType<typeof mockedPrisma.skill.findUnique>>,
    );

    vi.mocked(mockedPrisma.skill.findMany).mockResolvedValue([
      {
        slug: "pkg--skill-b",
        name: "Skill B",
        description: "Description B",
        category: "集成包",
        tags: [],
        packageName: "pkg",
        stars: 0,
        filePath: "skills/pkg/skill-b/SKILL.md",
      },
    ] as unknown as Awaited<ReturnType<typeof mockedPrisma.skill.findMany>>);

    const skill = await getSkillBySlug("pkg--skill-a");

    expect(skill).not.toBeNull();
    expect(skill?.slug).toBe("pkg--skill-a");
    expect(skill?.name).toBe("Skill A");
    expect(skill?.packageName).toBe("pkg");
    expect(skill?.stars).toBe(0);
    expect(skill?.relatedSkills).toHaveLength(1);
    expect(skill?.relatedSkills[0]?.slug).toBe("pkg--skill-b");
    expect(mockedPrisma.skill.findMany).toHaveBeenCalledWith({
      where: { packageId: "pkg-1", NOT: { id: "skill-1" } },
      take: 3,
    });
  });
});

describe("getPackageBySlug", () => {
  beforeEach(() => {
    vi.mocked(mockedPrisma.package.findUnique).mockReset();
  });

  it("returns null when package is not found", async () => {
    vi.mocked(mockedPrisma.package.findUnique).mockResolvedValue(null);

    const pkg = await getPackageBySlug("nonexistent");

    expect(pkg).toBeNull();
    expect(mockedPrisma.package.findUnique).toHaveBeenCalledWith({
      where: { slug: "nonexistent" },
      include: { skills: true },
    });
  });

  it("returns package detail with skills from the database", async () => {
    const mockPackage = {
      id: "pkg-1",
      slug: "my-pkg",
      name: "my-pkg",
      description: "A test package",
      sourceRepo: "owner/repo",
      skills: [
        {
          id: "skill-1",
          slug: "my-pkg--skill-a",
          name: "skill-a",
          description: "Skill A",
          category: "集成包",
          tags: ["tag1"],
          fileList: [{ path: "SKILL.md", language: "markdown", size: 100 }],
        },
      ],
    };

    vi.mocked(mockedPrisma.package.findUnique).mockResolvedValue(
      mockPackage as unknown as Awaited<ReturnType<typeof mockedPrisma.package.findUnique>>,
    );

    const pkg = await getPackageBySlug("my-pkg");

    expect(pkg).not.toBeNull();
    expect(pkg?.slug).toBe("my-pkg");
    expect(pkg?.name).toBe("my-pkg");
    expect(pkg?.description).toBe("A test package");
    expect(pkg?.category).toBe("集成包");
    expect(pkg?.installCommand).toBe("npx dt-skills add my-pkg");
    expect(pkg?.skills).toHaveLength(1);
    expect(pkg?.skills[0]).toMatchObject({
      slug: "my-pkg--skill-a",
      name: "skill-a",
      description: "Skill A",
      category: "集成包",
      tags: ["tag1"],
      packageName: "my-pkg",
      stars: 0,
      filePath: "",
    });
  });
});
