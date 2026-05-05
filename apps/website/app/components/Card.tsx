import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-canvas border border-card-border rounded-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

interface SkillCardProps {
  name: string;
  description: string;
  category?: string;
  stars?: number;
  href: string;
}

export function SkillCard({ name, description, category, stars, href }: SkillCardProps) {
  return (
    <a
      href={href}
      className="block bg-canvas border border-card-border rounded-sm p-6 hover:border-hairline transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-body text-lg font-medium text-ink group-hover:text-action-blue transition-colors">
          {name}
        </h3>
        {stars !== undefined && (
          <span className="shrink-0 font-mono text-xs text-muted">★ {stars}</span>
        )}
      </div>
      <p className="mt-2 font-body text-sm text-body-muted line-clamp-2">{description}</p>
      {category && (
        <span className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-coral">
          {category}
        </span>
      )}
    </a>
  );
}
