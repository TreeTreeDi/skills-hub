import { CopyButton } from "../../components/CopyButton";
import { SkillCard } from "../../components/Card";
import { getPackageBySlug, getPackageSlugs } from "../../lib/skills";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getPackageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);

  if (!pkg) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-6xl px-6 py-section">
        <div className="mb-10">
          <a href="/" className="font-body text-sm text-muted hover:text-ink transition-colors">
            ← Back to catalog
          </a>
          <h1 className="mt-4 font-display text-[72px] font-normal leading-none tracking-[-1.44px] text-ink">
            {pkg.name}
          </h1>
          <p className="mt-4 max-w-2xl font-body text-lg text-body-muted">{pkg.description}</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="font-mono text-xs uppercase tracking-wide text-coral">
              {pkg.category}
            </span>
            <span className="font-mono text-xs text-muted">{pkg.skills.length} skills</span>
          </div>
        </div>

        <div className="mb-10 flex items-center justify-between gap-4 rounded-sm border border-hairline bg-soft-stone p-4">
          <code className="break-all font-mono text-sm text-ink">{pkg.installCommand}</code>
          <CopyButton text={pkg.installCommand} />
        </div>

        <section>
          <h2 className="mb-6 font-body text-2xl text-ink">Included Skills</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pkg.skills.map((skill) => (
              <SkillCard
                key={skill.slug}
                name={skill.name}
                description={skill.description}
                category="技能"
                href={`/skill/${skill.slug}`}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
