import { Suspense } from "react";
import { Catalog } from "./components/Catalog";
import { AgentMarquee } from "./components/AgentMarquee";
import { CommandBlock } from "./components/CommandBlock";

export const revalidate = 3600;

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-section pb-16">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[clamp(48px,6vw,80px)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
            DTSKILLS
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate">
            开放 Agent 技能生态
          </p>
        </div>

        {/* Command bar */}
        <div className="mt-10 bg-canvas border border-hairline rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-8 flex-wrap">
          <div className="flex flex-col gap-2.5 flex-1 min-w-[280px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate">
              立即体验
            </span>
            <CommandBlock command="npx dt-skills add find-skills" />
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate">
              支持的 Agent 平台
            </span>
            <AgentMarquee />
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mx-auto max-w-6xl px-6 pb-section">
        <Suspense fallback={<CatalogSkeleton />}>
          <Catalog />
        </Suspense>
      </section>
    </main>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-full max-w-xl border border-hairline rounded-lg" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 border border-hairline rounded-lg" />
        ))}
      </div>
      <div className="border border-hairline rounded-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-hairline last:border-b-0" />
        ))}
      </div>
    </div>
  );
}
