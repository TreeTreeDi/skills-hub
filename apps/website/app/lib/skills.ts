import type { Skill, SkillDetail } from "./types";

// Mock data — replace with GitHub API fetching when repo is set up
const MOCK_SKILLS: Skill[] = [
  {
    slug: "tdd",
    name: "tdd",
    description:
      "Test-driven development with red-green-refactor loop. Write failing tests first, then implement.",
    category: "工程效率",
    tags: ["testing", "tdd", "quality"],
    packageName: "mattpocock-skills",
    stars: 42,
    filePath: "skills/mattpocock-skills/tdd/SKILL.md",
  },
  {
    slug: "grill-me",
    name: "grill-me",
    description:
      "Interview the user relentlessly about a plan or design until reaching shared understanding.",
    category: "通用",
    tags: ["planning", "design", "interview"],
    packageName: "mattpocock-skills",
    stars: 38,
    filePath: "skills/mattpocock-skills/grill-me/SKILL.md",
  },
  {
    slug: "diagnose",
    name: "diagnose",
    description: "Disciplined diagnosis loop for hard bugs and performance regressions.",
    category: "工程效率",
    tags: ["debugging", "diagnosis", "performance"],
    packageName: "mattpocock-skills",
    stars: 35,
    filePath: "skills/mattpocock-skills/diagnose/SKILL.md",
  },
  {
    slug: "write-a-skill",
    name: "write-a-skill",
    description:
      "Create new agent skills with proper structure, progressive disclosure, and bundled resources.",
    category: "通用",
    tags: ["skills", "authoring", "documentation"],
    packageName: "mattpocock-skills",
    stars: 29,
    filePath: "skills/mattpocock-skills/write-a-skill/SKILL.md",
  },
  {
    slug: "frontend-ui",
    name: "frontend-ui",
    description:
      "Build production-quality UIs with accessibility, responsive design, and component architecture.",
    category: "前端",
    tags: ["frontend", "ui", "react", "accessibility"],
    packageName: "frontend-pack",
    stars: 51,
    filePath: "skills/frontend-pack/frontend-ui/SKILL.md",
  },
  {
    slug: "api-design",
    name: "api-design",
    description:
      "Design stable APIs and interfaces with clear contracts, versioning, and backward compatibility.",
    category: "后端",
    tags: ["api", "rest", "graphql", "design"],
    packageName: "backend-pack",
    stars: 33,
    filePath: "skills/backend-pack/api-design/SKILL.md",
  },
];

const CATEGORIES = [
  "全部",
  "通用",
  "前端",
  "后端",
  "数据与AI",
  "运维与系统",
  "工程效率",
  "安全",
  "其他",
];

export function getCategories(): string[] {
  return CATEGORIES;
}

export async function getSkills(options?: {
  keyword?: string;
  category?: string;
  sort?: "stars" | "recent";
}): Promise<Skill[]> {
  let skills = [...MOCK_SKILLS];

  if (options?.keyword) {
    const kw = options.keyword.toLowerCase();
    skills = skills.filter(
      (s) =>
        s.name.toLowerCase().includes(kw) ||
        s.description.toLowerCase().includes(kw) ||
        s.tags.some((t) => t.includes(kw)),
    );
  }

  if (options?.category && options.category !== "全部") {
    skills = skills.filter((s) => s.category === options.category);
  }

  if (options?.sort === "stars") {
    skills.sort((a, b) => b.stars - a.stars);
  }

  return skills;
}

export async function getSkillBySlug(slug: string): Promise<SkillDetail | null> {
  const skill = MOCK_SKILLS.find((s) => s.slug === slug);
  if (!skill) return null;

  return {
    ...skill,
    skillMd: `---
name: ${skill.name}
description: ${skill.description}
---

# ${skill.name}

${skill.description}

## When to Use

Use this skill when you need to ${skill.description.toLowerCase()}.

## Steps

1. Identify the problem
2. Apply the skill pattern
3. Verify the result
`,
    fileList: [
      { path: "SKILL.md", language: "markdown", size: 256 },
      { path: "resources/template.ts", language: "typescript", size: 1024 },
    ],
    installCommand: `npx skills add mattpocock/skills@${skill.name}`,
    relatedSkills: MOCK_SKILLS.filter(
      (s) => s.packageName === skill.packageName && s.slug !== skill.slug,
    ).slice(0, 3),
  };
}
