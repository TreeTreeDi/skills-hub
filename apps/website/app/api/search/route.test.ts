import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "../../lib/prisma";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRawUnsafe).mockReset();
  });

  function createRequest(url: string): Request {
    return new Request(url) as Request;
  }

  it("returns skills when no query is provided", async () => {
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([
        {
          id: "hello--world",
          slug: "hello--world",
          name: "World",
          description: "A hello world skill",
          packageName: "hello",
          installs: 0,
          category: "单技能",
        },
      ])
      .mockResolvedValueOnce([{ count: 1 }]);

    const req = createRequest("http://localhost/api/search");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0]).toMatchObject({
      id: "hello--world",
      name: "World",
      packageName: "hello",
      installs: 0,
    });
    expect(body.pagination).toEqual({
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });

  it("filters skills by keyword matching name", async () => {
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([
        {
          id: "ts--types",
          slug: "ts--types",
          name: "TypeScript Types",
          description: "Generate types",
          packageName: "ts",
          installs: 5,
          category: "单技能",
        },
      ])
      .mockResolvedValueOnce([{ count: 1 }]);

    const req = createRequest("http://localhost/api/search?q=typescript");
    const res = await GET(req);
    const body = await res.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0].name).toBe("TypeScript Types");
  });

  it("filters skills by keyword matching description", async () => {
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([
        {
          id: "a--b",
          slug: "a--b",
          name: "Alpha",
          description: "Beta gamma delta",
          packageName: "a",
          installs: 0,
          category: "单技能",
        },
      ])
      .mockResolvedValueOnce([{ count: 1 }]);

    const req = createRequest("http://localhost/api/search?q=gamma");
    const res = await GET(req);
    const body = await res.json();
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0].name).toBe("Alpha");
  });

  it("respects the limit parameter", async () => {
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, i) => ({
          id: `pkg--skill-${i}`,
          slug: `pkg--skill-${i}`,
          name: `Skill ${i}`,
          description: "",
          packageName: "pkg",
          installs: 0,
          category: "单技能",
        })),
      )
      .mockResolvedValueOnce([{ count: 20 }]);

    const req = createRequest("http://localhost/api/search?limit=5");
    const res = await GET(req);
    const body = await res.json();
    expect(body.skills).toHaveLength(5);
    expect(body.pagination).toMatchObject({
      pageSize: 5,
      total: 20,
      totalPages: 4,
    });
  });

  it("returns empty array when data source throws", async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockRejectedValue(
      new Error("Database error"),
    );

    const req = createRequest("http://localhost/api/search?q=test");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.skills).toEqual([]);
    expect(body.pagination).toEqual({
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });

  it("returns packages when target=packages", async () => {
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([
        {
          id: "pkg-1",
          slug: "pkg-1",
          name: "Package 1",
          description: "Desc",
          skillsCount: 3,
          installs: 100,
          skillSlug: "skill-a",
        },
      ])
      .mockResolvedValueOnce([{ count: 1 }]);

    const req = createRequest("http://localhost/api/search?target=packages");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skills).toBeUndefined();
    expect(body.packages).toHaveLength(1);
    expect(body.packages[0]).toMatchObject({
      id: "pkg-1",
      name: "Package 1",
      skillsCount: 3,
      installs: 100,
    });
    expect(body.pagination).toEqual({
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });
});
