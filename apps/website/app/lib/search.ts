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

export interface PackageSearchResultItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  skillsCount: number;
  installs: number;
  skillSlug: string | null;
}

export interface PaginatedSearchResult<T = SearchResultItem> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class SearchService {
  constructor(private db: PrismaQueryRaw) {}

  async search(options: SearchOptions = {}): Promise<PaginatedSearchResult<SearchResultItem>> {
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

  async searchPackages(options: SearchOptions = {}): Promise<PaginatedSearchResult<PackageSearchResultItem>> {
    const { query, tab = "all", page = 1, limit = 20 } = options;

    const conditions: string[] = [];
    const whereParams: unknown[] = [];

    let orderBy: string;
    let joinSkill = false;

    if (query && query.trim()) {
      const q = query.trim();
      whereParams.push(q, `%${q}%`);
      joinSkill = true;
      orderBy = `matching_skills.max_rank DESC, "Package".installs DESC`;
    } else if (tab === "trending") {
      orderBy = `(
        SELECT COUNT(*) FROM "InstallEvent"
        WHERE "InstallEvent"."packageId" = "Package".id
        AND "InstallEvent"."createdAt" > NOW() - INTERVAL '24 hours'
      ) DESC, "Package".installs DESC`;
    } else if (tab === "hot") {
      orderBy = `(
        SELECT COUNT(*) FROM "InstallEvent"
        WHERE "InstallEvent"."packageId" = "Package".id
        AND "InstallEvent"."createdAt" > NOW() - INTERVAL '7 days'
      ) DESC, "Package".installs DESC`;
    } else {
      orderBy = `"Package".installs DESC, "Package".name ASC`;
    }

    const offset = (page - 1) * limit;
    const pagingParams = [limit, offset];

    const selectFields = `
      "Package".id,
      "Package".slug,
      "Package".name,
      "Package".description,
      "Package"."skillsCount",
      "Package".installs,
      (SELECT slug FROM "Skill" WHERE "Skill"."packageId" = "Package".id LIMIT 1) as "skillSlug"
    `;

    let itemsSql: string;
    let countSql: string;

    if (joinSkill) {
      itemsSql = `
        WITH matching_skills AS (
          SELECT
            "packageId",
            MAX(ts_rank("searchVector", plainto_tsquery('chinese', $1))) as max_rank
          FROM "Skill"
          WHERE "searchVector" @@ plainto_tsquery('chinese', $1)
             OR similarity("name", $2) > 0.1
          GROUP BY "packageId"
        )
        SELECT ${selectFields}
        FROM "Package"
        JOIN matching_skills ON matching_skills."packageId" = "Package".id
        ORDER BY ${orderBy}
        LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
      `;

      countSql = `
        WITH matching_skills AS (
          SELECT "packageId"
          FROM "Skill"
          WHERE "searchVector" @@ plainto_tsquery('chinese', $1)
             OR similarity("name", $2) > 0.1
          GROUP BY "packageId"
        )
        SELECT COUNT(*) as count FROM matching_skills
      `;
    } else {
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      itemsSql = `
        SELECT ${selectFields}
        FROM "Package"
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
      `;

      countSql = `
        SELECT COUNT(*) as count
        FROM "Package"
        ${whereClause}
      `;
    }

    const [items, countResult] = await Promise.all([
      this.db.$queryRawUnsafe<PackageSearchResultItem[]>(itemsSql, ...whereParams, ...pagingParams),
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
