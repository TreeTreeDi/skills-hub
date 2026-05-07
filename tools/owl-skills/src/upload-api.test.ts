import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { uploadToHub, createZip } from "./upload-api.ts";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stat } from "node:fs/promises";

describe("createZip", () => {
  const testDir = join(tmpdir(), "owl-skills-test-zip");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "SKILL.md"), "---\nname: test\ndescription: test\n---\n");
    writeFileSync(join(testDir, "readme.md"), "# Test");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("creates a zip file from directory", async () => {
    const zipPath = await createZip(testDir);
    expect(existsSync(zipPath)).toBe(true);
    const stats = await stat(zipPath);
    expect(stats.size).toBeGreaterThan(0);
    rmSync(zipPath);
  });
});

describe("uploadToHub", () => {
  const testDir = join(tmpdir(), "owl-skills-test-upload-api");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns error for invalid directory", async () => {
    const result = await uploadToHub("/nonexistent/path");
    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist");
  });

  it("returns error when SKILL.md is missing", async () => {
    const result = await uploadToHub(testDir);
    expect(result.success).toBe(false);
    expect(result.error).toContain("SKILL.md");
  });
});
