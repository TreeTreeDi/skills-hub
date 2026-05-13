import { getSkillRecords } from "../../lib/skills";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const rawLimit = parseInt(searchParams.get("limit") || "10", 10);
  const limit = Number.isNaN(rawLimit) ? 10 : Math.min(Math.max(rawLimit, 1), 50);

  try {
    const skills = await getSkillRecords();

    let filtered = skills;

    if (query) {
      const keyword = query.toLowerCase();
      filtered = skills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(keyword) ||
          skill.description?.toLowerCase().includes(keyword) ||
          skill.tags?.some((tag: string) => tag.toLowerCase().includes(keyword)),
      );
    }

    const results = filtered.slice(0, limit).map((skill) => ({
      id: skill.slug,
      name: skill.name,
      installs: skill.stars,
      source: skill.packageName,
    }));

    return Response.json({ skills: results });
  } catch {
    return Response.json({ skills: [] });
  }
}
