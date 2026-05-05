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
  fileList: Array<{
    path: string;
    language: string;
    size: number;
  }>;
  installCommand: string;
  relatedSkills: Skill[];
}

export interface PackageInfo {
  name: string;
  skills: Skill[];
  uploaderName: string;
  uploaderEmail: string;
  createdAt: string;
}
