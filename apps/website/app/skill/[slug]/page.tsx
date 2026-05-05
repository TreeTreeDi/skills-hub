import { getSkillBySlug } from "../../lib/skills";
import { SkillCard } from "../../components/Card";
import { CopyButton } from "../../components/CopyButton";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);

  if (!skill) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-6xl px-6 py-section">
        {/* Header */}
        <div className="mb-10">
          <a href="/" className="font-body text-sm text-muted hover:text-ink transition-colors">
            ← Back to skills
          </a>
          <h1 className="mt-4 font-display text-[72px] font-normal leading-none tracking-[-1.44px] text-ink">
            {skill.name}
          </h1>
          <p className="mt-4 font-body text-lg text-body-muted max-w-2xl">{skill.description}</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="font-mono text-xs uppercase tracking-wide text-coral">
              {skill.category}
            </span>
            <span className="font-mono text-xs text-muted">★ {skill.stars}</span>
            <span className="font-mono text-xs text-muted">{skill.packageName}</span>
          </div>
        </div>

        {/* Install command */}
        <div className="mb-10 rounded-sm border border-hairline bg-soft-stone p-4 flex items-center justify-between gap-4">
          <code className="font-mono text-sm text-ink break-all">{skill.installCommand}</code>
          <CopyButton text={skill.installCommand} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content — SKILL.md */}
          <div className="lg:col-span-2">
            <h2 className="font-body text-sm font-medium uppercase tracking-wide text-muted mb-4">
              Documentation
            </h2>
            <article className="prose prose-sm max-w-none font-body text-ink">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{skill.skillMd}</pre>
            </article>
          </div>

          {/* Sidebar */}
          <div>
            {/* File list */}
            <div className="mb-8">
              <h2 className="font-body text-sm font-medium uppercase tracking-wide text-muted mb-3">
                Files ({skill.fileList.length})
              </h2>
              <ul className="space-y-2">
                {skill.fileList.map((file) => (
                  <li
                    key={file.path}
                    className="flex items-center justify-between font-mono text-xs"
                  >
                    <span className="text-ink">{file.path}</span>
                    <span className="text-muted">
                      {file.language} · {(file.size / 1024).toFixed(1)}KB
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags */}
            {skill.tags.length > 0 && (
              <div>
                <h2 className="font-body text-sm font-medium uppercase tracking-wide text-muted mb-3">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full border border-hairline px-2.5 py-1 font-mono text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related skills */}
        {skill.relatedSkills.length > 0 && (
          <section className="mt-16">
            <h2 className="font-body text-2xl text-ink mb-6">Related Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skill.relatedSkills.map((related) => (
                <SkillCard
                  key={related.slug}
                  name={related.name}
                  description={related.description}
                  category={related.category}
                  stars={related.stars}
                  href={`/skill/${related.slug}`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
