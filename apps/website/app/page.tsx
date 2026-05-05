import { getSkills, getCategories } from "./lib/skills";
import { SkillCard } from "./components/Card";
import { Chip } from "./components/Chip";
import { SearchBar } from "./components/SearchBar";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const keyword = params.q || "";
  const category = params.category || "全部";
  const sort = (params.sort as "stars" | "recent") || "stars";

  const [skills, categories] = await Promise.all([
    getSkills({ keyword, category, sort }),
    getCategories(),
  ]);

  return (
    <main className="min-h-screen bg-canvas">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-section pb-16">
        <h1 className="font-display text-[96px] font-normal leading-none tracking-[-1.92px] text-ink">
          Skills Hub
        </h1>
        <p className="mt-6 font-body text-lg text-body-muted max-w-2xl">
          Discover and install skills for AI coding agents.
        </p>

        {/* Search */}
        <div className="mt-10 max-w-xl">
          <SearchBar defaultValue={keyword} />
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-section">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <a key={cat} href={`/?category=${cat}&q=${keyword}&sort=${sort}`}>
              <Chip label={cat} active={cat === category} />
            </a>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-4 mb-6">
          <span className="font-mono text-xs uppercase text-muted">Sort by</span>
          <a
            href={`/?category=${category}&q=${keyword}&sort=stars`}
            className={`font-body text-sm ${sort === "stars" ? "text-ink font-medium" : "text-muted hover:text-ink"}`}
          >
            Stars
          </a>
          <a
            href={`/?category=${category}&q=${keyword}&sort=recent`}
            className={`font-body text-sm ${sort === "recent" ? "text-ink font-medium" : "text-muted hover:text-ink"}`}
          >
            Recent
          </a>
        </div>

        {/* Skill grid */}
        {skills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard
                key={skill.slug}
                name={skill.name}
                description={skill.description}
                category={skill.category}
                stars={skill.stars}
                href={`/skill/${skill.slug}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="font-body text-lg text-muted">
              No skills found{keyword ? ` for "${keyword}"` : ""}.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
