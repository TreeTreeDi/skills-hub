export interface Skill {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  packageName: string;
  stars: number;
  filePath: string;
}

export interface SkillDetail extends Skill {
  skillMd: string;
  skillMdBody: string;
  fileList: Array<{
    path: string;
    language: string;
    size: number;
  }>;
  installCommand: string;
  relatedSkills: Skill[];
}

export interface CatalogItem {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  stars: number;
  href: string;
  packageName: string;
  skillCount: number;
  updatedAt: number;
}

export interface PackageDetail {
  slug: string;
  name: string;
  description: string;
  category: "集成包";
  installCommand: string;
  skills: Skill[];
}

export interface PackageInfo {
  name: string;
  skills: Skill[];
  uploaderName: string;
  uploaderEmail: string;
  createdAt: string;
}
