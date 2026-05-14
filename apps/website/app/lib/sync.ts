import { prisma } from "./prisma";
import { getSkillRecords, type SkillRecord } from "./skills";

export interface SyncResult {
  packageName: string;
  skillsSynced: number;
  errors: string[];
}

export interface SyncAllResult {
  packagesSynced: number;
  skillsSynced: number;
  errors: string[];
}

export class SyncService {
  async syncAll(): Promise<SyncAllResult> {
    const skills = await getSkillRecords();
    const errors: string[] = [];
    let skillsSynced = 0;

    // Group by package
    const packageMap = new Map<string, SkillRecord[]>();
    for (const skill of skills) {
      const existing = packageMap.get(skill.packageName);
      if (existing) {
        existing.push(skill);
      } else {
        packageMap.set(skill.packageName, [skill]);
      }
    }

    for (const [packageName, packageSkills] of packageMap) {
      const result = await this.syncPackage(packageName, packageSkills);
      skillsSynced += result.skillsSynced;
      errors.push(...result.errors);
    }

    // Rebuild search vectors after all syncs
    await this.rebuildSearchVectors();

    return {
      packagesSynced: packageMap.size,
      skillsSynced,
      errors,
    };
  }

  async syncPackage(packageName: string, skills?: SkillRecord[]): Promise<SyncResult> {
    const errors: string[] = [];
    let skillsSynced = 0;

    try {
      const allSkills = skills ?? await getSkillRecords();
      const packageSkills = allSkills.filter((s) => s.packageName === packageName);

      if (packageSkills.length === 0) {
        return { packageName, skillsSynced: 0, errors: [`No skills found for package ${packageName}`] };
      }

      const description = packageSkills.length > 1
        ? `${packageSkills.length} 个技能，包含 ${packageSkills.map((s) => s.name).join("、")}`
        : packageSkills[0]?.description;

      const pkg = await prisma.package.upsert({
        where: { slug: packageName },
        update: {
          name: packageName,
          description,
          skillsCount: packageSkills.length,
          syncedAt: new Date(),
        },
        create: {
          slug: packageName,
          name: packageName,
          sourceRepo: "TreeTreeDi/skills-data",
          description,
          skillsCount: packageSkills.length,
          syncedAt: new Date(),
        },
      });

      for (const skill of packageSkills) {
        try {
          await prisma.skill.upsert({
            where: { slug: skill.slug },
            update: {
              name: skill.name,
              description: skill.description,
              tags: skill.tags,
              category: skill.category,
              fileList: skill.fileList as unknown as Record<string, unknown>[],
              skillMdBody: skill.skillMdBody,
              syncedAt: new Date(),
              packageId: pkg.id,
            },
            create: {
              slug: skill.slug,
              name: skill.name,
              description: skill.description,
              tags: skill.tags,
              category: skill.category,
              fileList: skill.fileList as unknown as Record<string, unknown>[],
              skillMdBody: skill.skillMdBody,
              syncedAt: new Date(),
              packageId: pkg.id,
            },
          });
          skillsSynced++;
        } catch (e) {
          errors.push(`Failed to sync skill ${skill.slug}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      return { packageName, skillsSynced, errors };
    } catch (e) {
      return {
        packageName,
        skillsSynced: 0,
        errors: [e instanceof Error ? e.message : String(e)],
      };
    }
  }

  async rebuildSearchVectors(): Promise<void> {
    await prisma.$executeRawUnsafe(`
      UPDATE "Skill"
      SET "searchVector" = setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
                           setweight(to_tsvector('simple', coalesce("description", '')), 'B') ||
                           setweight(to_tsvector('simple', coalesce("skillMdBody", '')), 'C');
    `);
  }
}
