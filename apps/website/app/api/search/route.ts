import { SearchService } from "../../lib/search";
import { prisma } from "../../lib/prisma";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || undefined;
  const tab = (searchParams.get("tab") as "all" | "trending" | "hot") || "all";
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(rawPage, 1);
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);

  try {
    const service = new SearchService(prisma);
    const result = await service.search({ query, tab, page, limit });

    return Response.json({
      skills: result.items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        packageName: item.packageName,
        installs: item.installs,
        category: item.category,
      })),
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch {
    return Response.json(
      { skills: [], pagination: { total: 0, page, pageSize: limit, totalPages: 0 } },
      { status: 500 },
    );
  }
}
