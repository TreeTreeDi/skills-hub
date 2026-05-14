import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { OwlConfig } from "./types.ts";

export const DEFAULT_CONFIG: OwlConfig = {
  defaultRepo: "TreeTreeDi/skills-data",
};

export function getConfigPath(): string {
  return join(homedir(), ".dt-skills", "config.json");
}

export function readConfig(configPath?: string): OwlConfig {
  const path = configPath ?? getConfigPath();

  try {
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content) as Record<string, unknown>;

    return {
      defaultRepo:
        typeof parsed.defaultRepo === "string" ? parsed.defaultRepo : DEFAULT_CONFIG.defaultRepo,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
