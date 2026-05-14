export interface PrismaQueryRaw {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
}

export interface SearchOptions {
  query?: string;
  tab?: "all" | "trending" | "hot";
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  packageName: string;
  installs: number;
  category: string;
}

export interface PaginatedSearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class SearchService {
  constructor(private db: PrismaQueryRaw) {}

  async search(options: SearchOptions = {}): Promise<PaginatedSearchResult> {
    const { query, tab = "all", page = 1, limit = 20 } = options;

    const conditions: string[] = [];
    const whereParams: unknown[] = [];

    if (query && query.trim()) {
      const q = query.trim();
      whereParams.push(q, `%${q}%`);
      conditions.push(`(
        "searchVector" @@ plainto_tsquery('chinese', $1)
        OR similarity("name", $2) > 0.1
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderBy: string;
    if (query && query.trim()) {
      const q = query.trim();
      whereParams.push(q);
      orderBy = `ts_rank("searchVector", plainto_tsquery('chinese', $${whereParams.length})) DESC, "installs" DESC`;
    } else if (tab === "trending") {
      orderBy = `(
        SELECT COUNT(*) FROM "InstallEvent"
        WHERE "InstallEvent"."skillId" = "Skill".id
        AND "InstallEvent"."createdAt" > NOW() - INTERVAL '24 hours'
      ) DESC, "installs" DESC`;
    } else if (tab === "hot") {
      orderBy = `(
        SELECT COUNT(*) FROM "InstallEvent"
        WHERE "InstallEvent"."skillId" = "Skill".id
        AND "InstallEvent"."createdAt" > NOW() - INTERVAL '7 days'
      ) DESC, "installs" DESC`;
    } else {
      orderBy = `"installs" DESC, "name" ASC`;
    }

    const offset = (page - 1) * limit;
    const pagingParams = [limit, offset];

    const itemsSql = `
      SELECT
        "Skill".id,
        "Skill".slug,
        "Skill".name,
        "Skill".description,
        "Package".name as "packageName",
        "Skill".installs,
        "Skill".category
      FROM "Skill"
      JOIN "Package" ON "Skill"."packageId" = "Package".id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*) as count
      FROM "Skill"
      JOIN "Package" ON "Skill"."packageId" = "Package".id
      ${whereClause}
    `;

    const [items, countResult] = await Promise.all([
      this.db.$queryRawUnsafe<SearchResultItem[]>(itemsSql, ...whereParams, ...pagingParams),
      this.db.$queryRawUnsafe<{ count: number }[]>(countSql, ...whereParams),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages,
    };
  }
}
