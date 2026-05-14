import { Suspense } from "react";
import { getCatalogItems, getCategories } from "./lib/skills";
import { Catalog } from "./components/Catalog";
import { AgentMarquee } from "./components/AgentMarquee";
import { CommandBlock } from "./components/CommandBlock";

export const revalidate = 3600;

export default async function Home() {
  const [items, categories] = await Promise.all([getCatalogItems(), getCategories()]);

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

        {/* Try it now + Agents */}
        <div className="mt-10 flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Try it now
            </span>
            <CommandBlock />
          </div>
          <AgentMarquee />
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-section">
        <Suspense fallback={<CatalogSkeleton />}>
          <Catalog items={items} categories={categories} />
        </Suspense>
      </section>
    </main>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-12 w-full max-w-xl border border-hairline rounded-sm" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-20 border border-hairline rounded-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 border border-card-border rounded-sm" />
        ))}
      </div>
    </div>
  );
}
