import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
import { basename, extname, join, relative, resolve } from "node:path";
import { parseSkillMd } from "./skill-parser";
import type { CatalogItem, PackageDetail, Skill, SkillDetail } from "./types";

const REPO_SKILLS_ROOT = resolve(process.cwd(), "skills");
const LEGACY_SKILLS_ROOT = resolve(process.cwd(), ".agents/skills");
const DEFAULT_GITHUB_OWNER = process.env.GITHUB_OWNER || "TreeTreeDi";
const DEFAULT_GITHUB_REPO = process.env.GITHUB_REPO || "skills-data";

const CATEGORIES = ["全部", "集成包", "单技能", "其他"];

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".js": "javascript",
  ".json": "json",
  ".md": "markdown",
  ".mjs": "javascript",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".txt": "text",
  ".yaml": "yaml",
  ".yml": "yaml",
};

interface SkillRecord extends Skill {
  skillMd: string;
  fileList: SkillDetail["fileList"];
  updatedAt: number;
}

interface PackageRecord {
  slug: string;
  name: string;
  description: string;
  category: "集成包";
  packageName: string;
  tags: string[];
  stars: number;
  skills: SkillRecord[];
  updatedAt: number;
}

interface RepoBlobEntry {
  path: string;
  size: number;
  sha?: string;
}

interface SkillDescriptor {
  packageName: string;
  skillDirPath: string;
  skillMdPath: string;
  fileEntries: RepoBlobEntry[];
  category: string;
}

interface SkillsRepoClient {
  listFiles(): Promise<RepoBlobEntry[]>;
  readTextFile(path: string, sha?: string): Promise<string>;
}

function toSlug(packageName: string, skillName: string): string {
  return `${packageName}--${skillName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toLanguage(filePath: string): string {
  return LANGUAGE_BY_EXTENSION[extname(filePath).toLowerCase()] ?? "text";
}

function toRelativeFileList(
  rootPath: string,
  fileEntries: RepoBlobEntry[],
): SkillDetail["fileList"] {
  return [...fileEntries]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((entry) => ({
      path: entry.path.slice(rootPath.length + 1),
      language: toLanguage(entry.path),
      size: entry.size,
    }));
}

function collectSkillDescriptors(entries: RepoBlobEntry[]): SkillDescriptor[] {
  const descriptors: SkillDescriptor[] = [];
  const blobs = entries.filter((entry) => entry.path.startsWith("skills/"));
  const packageSkillCounts = new Map<string, number>();
  const packageHasNestedSkills = new Map<string, boolean>();

  for (const entry of blobs) {
    if (!entry.path.endsWith("SKILL.md")) continue;
    const parts = entry.path.split("/");
    if (parts.length < 3 || parts[0] !== "skills") continue;
    const packageName = parts[1]!;
    packageSkillCounts.set(packageName, (packageSkillCounts.get(packageName) ?? 0) + 1);
    if (parts.length > 3) {
      packageHasNestedSkills.set(packageName, true);
    }
  }

  for (const entry of blobs) {
    if (!entry.path.endsWith("SKILL.md")) continue;

    const parts = entry.path.split("/");
    if (parts.length < 3 || parts[0] !== "skills") continue;

    let packageName: string;
    let skillDirPath: string;

    if (parts.length === 3 && parts[2] === "SKILL.md") {
      packageName = parts[1]!;
      skillDirPath = `skills/${packageName}`;
    } else {
      packageName = parts[1]!;
      skillDirPath = entry.path.slice(0, -"/SKILL.md".length);
    }

    descriptors.push({
      packageName,
      skillDirPath,
      skillMdPath: entry.path,
      fileEntries: blobs.filter(
        (blob) => blob.path === entry.path || blob.path.startsWith(`${skillDirPath}/`),
      ),
      category:
        (packageHasNestedSkills.get(packageName) ?? false) ||
        (packageSkillCounts.get(packageName) ?? 0) > 1
          ? "集成包"
          : "单技能",
    });
  }

  return descriptors.sort((a, b) => a.skillMdPath.localeCompare(b.skillMdPath));
}

class OctokitSkillsRepoClient implements SkillsRepoClient {
  private octokit: Octokit;

  constructor(
    private owner: string,
    private repo: string,
  ) {
    const token = process.env.GITHUB_TOKEN;
    this.octokit = new Octokit(token ? { auth: token } : undefined);
  }

  async listFiles(): Promise<RepoBlobEntry[]> {
    const { data: repo } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    const { data: ref } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${repo.default_branch}`,
    });

    const { data: commit } = await this.octokit.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: ref.object.sha,
    });

    const { data: tree } = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: commit.tree.sha,
      recursive: "true",
    });

    return tree.tree
      .filter((entry) => entry.type === "blob" && typeof entry.path === "string")
      .map((entry) => ({
        path: entry.path!,
        size: entry.size ?? 0,
        sha: entry.sha,
      }));
  }

  async readTextFile(path: string, sha?: string): Promise<string> {
    if (sha) {
      const { data } = await this.octokit.git.getBlob({
        owner: this.owner,
        repo: this.repo,
        file_sha: sha,
      });
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    const response = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
    });

    if (!("content" in response.data) || !response.data.content) {
      throw new Error(`Unable to read ${path} from ${this.owner}/${this.repo}`);
    }

    return Buffer.from(response.data.content, "base64").toString("utf-8");
  }
}

async function listDirectories(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => join(rootDir, entry.name));
}

async function collectLocalFileEntries(
  rootDir: string,
  virtualRoot = relative(process.cwd(), rootDir).replaceAll("\\", "/"),
): Promise<RepoBlobEntry[]> {
  const files: RepoBlobEntry[] = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.shift()!;
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      const fileStat = await stat(fullPath);
      files.push({
        path: join(virtualRoot, relative(rootDir, fullPath)).replaceAll("\\", "/"),
        size: fileStat.size,
      });
    }
  }

  return files;
}

async function loadSkillsFromLocalPackages(rootDir: string): Promise<SkillRecord[]> {
  let packageDirs: string[];
  try {
    packageDirs = await listDirectories(rootDir);
  } catch {
    return [];
  }

  const packageEntries = await Promise.all(
    packageDirs.map(async (packageDir) =>
      collectLocalFileEntries(packageDir, `skills/${basename(packageDir)}`),
    ),
  );

  const fileEntries = packageEntries.flat();
  const descriptors = collectSkillDescriptors(fileEntries);

  return buildSkillRecordsFromDescriptors(descriptors, {
    async readTextFile(skillMdPath) {
      return readFile(join(rootDir, skillMdPath.slice("skills/".length)), "utf-8");
    },
    getUpdatedAt(skillMdPath) {
      return stat(join(rootDir, skillMdPath.slice("skills/".length))).then(
        (fileStat) => fileStat.mtimeMs,
      );
    },
  });
}

async function loadSkillsFromLegacyRoot(rootDir: string): Promise<SkillRecord[]> {
  let skillDirs: string[];
  try {
    skillDirs = await listDirectories(rootDir);
  } catch {
    return [];
  }

  const skills = await Promise.all(
    skillDirs.map(async (skillDir) => {
      const skillMdPath = join(skillDir, "SKILL.md");

      try {
        const [content, fileStat, fileEntries] = await Promise.all([
          readFile(skillMdPath, "utf-8"),
          stat(skillMdPath),
          collectLocalFileEntries(
            skillDir,
            relative(process.cwd(), skillDir).replaceAll("\\", "/"),
          ),
        ]);
        const parsed = parseSkillMd(content);
        if (!parsed) {
          return null;
        }

        const packageName = basename(skillDir);

        return {
          slug: toSlug(packageName, parsed.frontmatter.name),
          name: parsed.frontmatter.name,
          description: parsed.frontmatter.description,
          category: "单技能",
          tags: parsed.frontmatter.tags ?? [],
          packageName,
          stars: 0,
          filePath: relative(process.cwd(), skillMdPath).replaceAll("\\", "/"),
          skillMd: content,
          fileList: toRelativeFileList(
            relative(process.cwd(), skillDir).replaceAll("\\", "/"),
            fileEntries,
          ),
          updatedAt: fileStat.mtimeMs,
        } satisfies SkillRecord;
      } catch {
        return null;
      }
    }),
  );

  return skills.filter((skill): skill is SkillRecord => skill !== null);
}

async function buildSkillRecordsFromDescriptors(
  descriptors: SkillDescriptor[],
  io: {
    readTextFile: (skillMdPath: string) => Promise<string>;
    getUpdatedAt: (skillMdPath: string) => Promise<number>;
  },
): Promise<SkillRecord[]> {
  const skills = await Promise.all(
    descriptors.map(async (descriptor) => {
      try {
        const [content, updatedAt] = await Promise.all([
          io.readTextFile(descriptor.skillMdPath),
          io.getUpdatedAt(descriptor.skillMdPath),
        ]);
        const parsed = parseSkillMd(content);
        if (!parsed) {
          return null;
        }

        return {
          slug: toSlug(descriptor.packageName, parsed.frontmatter.name),
          name: parsed.frontmatter.name,
          description: parsed.frontmatter.description,
          category: descriptor.category,
          tags: parsed.frontmatter.tags ?? [],
          packageName: descriptor.packageName,
          stars: 0,
          filePath: descriptor.skillMdPath,
          skillMd: content,
          fileList: toRelativeFileList(descriptor.skillDirPath, descriptor.fileEntries),
          updatedAt,
        } satisfies SkillRecord;
      } catch {
        return null;
      }
    }),
  );

  return skills.filter((skill): skill is SkillRecord => skill !== null);
}

async function loadSkillsFromDefaultRepo(client?: SkillsRepoClient): Promise<SkillRecord[]> {
  const repoClient =
    client ?? new OctokitSkillsRepoClient(DEFAULT_GITHUB_OWNER, DEFAULT_GITHUB_REPO);
  const fileEntries = await repoClient.listFiles();
  const descriptors = collectSkillDescriptors(fileEntries);

  return buildSkillRecordsFromDescriptors(descriptors, {
    readTextFile: (skillMdPath) => {
      const entry = fileEntries.find((file) => file.path === skillMdPath);
      return repoClient.readTextFile(skillMdPath, entry?.sha);
    },
    getUpdatedAt: async () => 0,
  });
}

async function getSkillRecords(client?: SkillsRepoClient): Promise<SkillRecord[]> {
  if (existsSync(REPO_SKILLS_ROOT)) {
    const localRepoSkills = await loadSkillsFromLocalPackages(REPO_SKILLS_ROOT);
    if (localRepoSkills.length > 0) {
      return localRepoSkills.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  try {
    const remoteSkills = await loadSkillsFromDefaultRepo(client);
    if (remoteSkills.length > 0) {
      return remoteSkills.sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch {
    // Fall through to legacy local discovery for local dev when remote fetch is unavailable.
  }

  const legacySkills = await loadSkillsFromLegacyRoot(LEGACY_SKILLS_ROOT);
  return legacySkills.sort((a, b) => a.name.localeCompare(b.name));
}

function groupPackages(skills: SkillRecord[]): PackageRecord[] {
  const packages = new Map<string, SkillRecord[]>();

  for (const skill of skills) {
    if (skill.category !== "集成包") continue;
    const existing = packages.get(skill.packageName);
    if (existing) {
      existing.push(skill);
    } else {
      packages.set(skill.packageName, [skill]);
    }
  }

  return [...packages.entries()]
    .map(([packageName, packageSkills]) => {
      const sortedSkills = [...packageSkills].sort((a, b) => a.name.localeCompare(b.name));
      const allTags = [...new Set(sortedSkills.flatMap((skill) => skill.tags))].sort();
      return {
        slug: packageName,
        name: packageName,
        description: `${sortedSkills.length} 个技能，包含 ${sortedSkills.map((skill) => skill.name).join("、")}`,
        category: "集成包",
        packageName,
        tags: allTags,
        stars: 0,
        skills: sortedSkills,
        updatedAt: Math.max(...sortedSkills.map((skill) => skill.updatedAt)),
      } satisfies PackageRecord;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCategories(): string[] {
  return CATEGORIES;
}

export async function getCatalogItems(options?: {
  keyword?: string;
  category?: string;
  sort?: "stars" | "recent";
}): Promise<CatalogItem[]> {
  const skills = await getSkillRecords();
  const packages = groupPackages(skills);

  let items: CatalogItem[] = [
    ...packages.map((pkg) => ({
      slug: pkg.slug,
      name: pkg.name,
      description: pkg.description,
      category: pkg.category,
      tags: pkg.tags,
      stars: pkg.stars,
      href: `/package/${pkg.slug}`,
      packageName: pkg.packageName,
      skillCount: pkg.skills.length,
      updatedAt: pkg.updatedAt,
    })),
    ...skills
      .filter((skill) => skill.category !== "集成包")
      .map((skill) => ({
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        tags: skill.tags,
        stars: skill.stars,
        href: `/skill/${skill.slug}`,
        packageName: skill.packageName,
        skillCount: 1,
        updatedAt: skill.updatedAt,
      })),
  ];

  if (options?.keyword) {
    const keyword = options.keyword.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    );
  }

  if (options?.category && options.category !== "全部") {
    items = items.filter((item) => item.category === options.category);
  }

  if (options?.sort === "recent") {
    items.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
  } else {
    items.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
  }

  return items;
}

export async function getSkillBySlug(slug: string): Promise<SkillDetail | null> {
  const skills = await getSkillRecords();
  const skill = skills.find((entry) => entry.slug === slug);
  if (!skill) {
    return null;
  }

  const relatedSkills = skills
    .filter((entry) => entry.packageName === skill.packageName && entry.slug !== skill.slug)
    .slice(0, 3);

  return {
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    tags: skill.tags,
    packageName: skill.packageName,
    stars: skill.stars,
    filePath: skill.filePath,
    skillMd: skill.skillMd,
    fileList: skill.fileList,
    installCommand: `owl add ${skill.packageName}`,
    relatedSkills,
  };
}

export async function getPackageBySlug(slug: string): Promise<PackageDetail | null> {
  const skills = await getSkillRecords();
  const pkg = groupPackages(skills).find((entry) => entry.slug === slug);
  if (!pkg) {
    return null;
  }

  return {
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description,
    category: "集成包",
    installCommand: `owl add ${pkg.packageName}`,
    skills: pkg.skills.map((skill) => ({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      tags: skill.tags,
      packageName: skill.packageName,
      stars: skill.stars,
      filePath: skill.filePath,
    })),
  };
}

export async function getSkillSlugs(): Promise<string[]> {
  const skills = await getSkillRecords();
  return skills.map((skill) => skill.slug);
}

export async function getPackageSlugs(): Promise<string[]> {
  const skills = await getSkillRecords();
  return groupPackages(skills).map((pkg) => pkg.slug);
}

export async function validateSkillSource(rootDir = REPO_SKILLS_ROOT): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!existsSync(rootDir)) {
    return { valid: true, errors };
  }

  const skills = await loadSkillsFromLocalPackages(rootDir);
  if (skills.length === 0) {
    errors.push(`No valid skills found under ${relative(process.cwd(), rootDir)}`);
  }

  return { valid: errors.length === 0, errors };
}

export const __internal = {
  collectSkillDescriptors,
  groupPackages,
  loadSkillsFromDefaultRepo,
  loadSkillsFromLegacyRoot,
  loadSkillsFromLocalPackages,
  toSlug,
};
