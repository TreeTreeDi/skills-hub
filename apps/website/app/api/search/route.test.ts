import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockGetSkillRecords = vi.fn();

vi.mock("../../lib/skills", () => ({
  getSkillRecords: (...args: unknown[]) => mockGetSkillRecords(...args),
}));

describe("GET /api/search", () => {
  beforeEach(() => {
    mockGetSkillRecords.mockReset();
  });

  function createRequest(url: string): Request {
    return new Request(url) as Request;
  }

  it("returns skills when no query is provided", async () => {
    mockGetSkillRecords.mockResolvedValue([
      {
        slug: "hello--world",
        name: "World",
        description: "A hello world skill",
        category: "单技能",
        tags: [],
        packageName: "hello",
        stars: 0,
        filePath: "skills/hello/SKILL.md",
        skillMd: "",
        skillMdBody: "",
        fileList: [],
        updatedAt: 0,
      },
    ]);

    const req = createRequest("http://localhost/api/search");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0]).toMatchObject({
      id: "hello--world",
      name: "World",
      installs: 0,
      source: "hello",
    });
  });

  it("filters skills by keyword matching name", async () => {
    mockGetSkillRecords.mockResolvedValue([
      {
        slug: "ts--types",
        name: "TypeScript Types",
        description: "Generate types",
        category: "单技能",
        tags: [],
        packageName: "ts",
        stars: 5,
        filePath: "skills/ts/SKILL.md",
        skillMd: "",
        skillMdBody: "",
        fileList: [],
        updatedAt: 0,
      },
      {
        slug: "js--lint",
        name: "JavaScript Lint",
        description: "Lint JS code",
        category: "单技能",
        tags: [],
        packageName: "js",
        stars: 3,
        filePath: "skills/js/SKILL.md",
        skillMd: "",
        skillMdBody: "",
        fileList: [],
        updatedAt: 0,
      },
    ]);

    const req = createRequest("http://localhost/api/search?q=typescript");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0].name).toBe("TypeScript Types");
  });

  it("filters skills by keyword matching description", async () => {
    mockGetSkillRecords.mockResolvedValue([
      {
        slug: "a--b",
        name: "Alpha",
        description: "Beta gamma delta",
        category: "单技能",
        tags: [],
        packageName: "a",
        stars: 0,
        filePath: "skills/a/SKILL.md",
        skillMd: "",
        skillMdBody: "",
        fileList: [],
        updatedAt: 0,
      },
    ]);

    const req = createRequest("http://localhost/api/search?q=gamma");
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0].name).toBe("Alpha");
  });

  it("respects the limit parameter", async () => {
    mockGetSkillRecords.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        slug: `pkg--skill-${i}`,
        name: `Skill ${i}`,
        description: "",
        category: "单技能",
        tags: [],
        packageName: "pkg",
        stars: 0,
        filePath: `skills/pkg/skill-${i}/SKILL.md`,
        skillMd: "",
        skillMdBody: "",
        fileList: [],
        updatedAt: 0,
      })),
    );

    const req = createRequest("http://localhost/api/search?limit=5");
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.skills).toHaveLength(5);
  });

  it("returns empty array when data source throws", async () => {
    mockGetSkillRecords.mockRejectedValue(new Error("GitHub API rate limit"));

    const req = createRequest("http://localhost/api/search?q=test");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills).toEqual([]);
  });
});
