import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { readConfig, getConfigPath, DEFAULT_CONFIG } from "./config.ts";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("getConfigPath", () => {
  it("returns path ending with .dt-skills/config.json", () => {
    const path = getConfigPath();
    expect(path).toContain(".dt-skills");
    expect(path).toContain("config.json");
  });
});

describe("readConfig", () => {
  const testDir = join(tmpdir(), "owl-skills-test-config");
  const configPath = join(testDir, "config.json");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns default config when file does not exist", () => {
    const config = readConfig(configPath);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("reads config from file", () => {
    const custom = { defaultRepo: "custom/repo" };
    writeFileSync(configPath, JSON.stringify(custom));

    const config = readConfig(configPath);
    expect(config).toEqual({ defaultRepo: "custom/repo" });
  });

  it("returns default config when file is invalid JSON", () => {
    writeFileSync(configPath, "not json");

    const config = readConfig(configPath);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("returns default config when file is empty", () => {
    writeFileSync(configPath, "");

    const config = readConfig(configPath);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("merges partial config with defaults", () => {
    const partial = {};
    writeFileSync(configPath, JSON.stringify(partial));

    const config = readConfig(configPath);
    expect(config).toEqual(DEFAULT_CONFIG);
  });
});
