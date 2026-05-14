import { describe, it, expect, vi } from "vitest";
import { SearchService, type PrismaQueryRaw } from "./search";

function createMockDb(): PrismaQueryRaw {
  return {
    $queryRawUnsafe: vi.fn(),
  };
}

describe("SearchService", () => {
  it("returns paginated results ordered by total installs for all tab", async () => {
    const db = createMockDb();
    const service = new SearchService(db);

    const mockItems = [
      {
        id: "1",
        slug: "skill-a",
        name: "Skill A",
        description: "Desc A",
        packageName: "pkg-a",
        installs: 100,
        category: "单技能",
      },
      {
        id: "2",
        slug: "skill-b",
        name: "Skill B",
        description: "Desc B",
        packageName: "pkg-b",
        installs: 50,
        category: "集成包",
      },
    ];

    vi.mocked(db.$queryRawUnsafe)
      .mockResolvedValueOnce(mockItems)
      .mockResolvedValueOnce([{ count: 2 }]);

    const result = await service.search({ tab: "all", page: 1, limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].installs).toBe(100);
    expect(result.items[1].installs).toBe(50);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it("returns trending results ordered by 24h installs", async () => {
    const db = createMockDb();
    const service = new SearchService(db);

    vi.mocked(db.$queryRawUnsafe)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }]);

    await service.search({ tab: "trending", page: 1, limit: 20 });

    const itemsCall = vi.mocked(db.$queryRawUnsafe).mock.calls[0];
    const sql = itemsCall[0] as string;
    expect(sql).toContain("INTERVAL '24 hours'");
  });

  it("returns hot results ordered by 7d installs", async () => {
    const db = createMockDb();
    const service = new SearchService(db);

    vi.mocked(db.$queryRawUnsafe)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }]);

    await service.search({ tab: "hot", page: 1, limit: 20 });

    const itemsCall = vi.mocked(db.$queryRawUnsafe).mock.calls[0];
    const sql = itemsCall[0] as string;
    expect(sql).toContain("INTERVAL '7 days'");
  });

  it("searches by keyword with tsvector and trgm", async () => {
    const db = createMockDb();
    const service = new SearchService(db);

    vi.mocked(db.$queryRawUnsafe)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }]);

    await service.search({ query: "search", page: 1, limit: 20 });

    const itemsCall = vi.mocked(db.$queryRawUnsafe).mock.calls[0];
    const sql = itemsCall[0] as string;
    expect(sql).toContain("plainto_tsquery");
    expect(sql).toContain("similarity");
  });

  it("calculates pagination correctly for middle pages", async () => {
    const db = createMockDb();
    const service = new SearchService(db);

    vi.mocked(db.$queryRawUnsafe)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 55 }]);

    const result = await service.search({ tab: "all", page: 2, limit: 20 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(55);
    expect(result.totalPages).toBe(3);

    const itemsCall = vi.mocked(db.$queryRawUnsafe).mock.calls[0];
    const sql = itemsCall[0] as string;
    expect(sql).toContain("LIMIT $1 OFFSET $2");
    expect(itemsCall[1]).toBe(20);
    expect(itemsCall[2]).toBe(20);
  });

  it("returns empty result when no skills match", async () => {
    const db = createMockDb();
    const service = new SearchService(db);

    vi.mocked(db.$queryRawUnsafe)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }]);

    const result = await service.search({ query: "nonexistent", page: 1, limit: 20 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
