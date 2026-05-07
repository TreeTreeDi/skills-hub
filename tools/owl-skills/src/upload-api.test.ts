import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { uploadToHub, createZip } from "./upload-api.ts";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { stat } from "node:fs/promises";
import { execFile } from "node:child_process";

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

  it("includes package directory as top-level prefix in zip", async () => {
    const zipPath = await createZip(testDir);
    const entries = await listZipEntries(zipPath);
    const dirName = basename(testDir);
    // All non-directory entries should start with dirName/
    const fileEntries = entries.filter((e) => !e.endsWith("/"));
    expect(fileEntries.length).toBeGreaterThan(0);
    for (const entry of fileEntries) {
      expect(entry).toMatch(new RegExp(`^${dirName}/`));
    }
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

  it("returns error when no valid skills found", async () => {
    const result = await uploadToHub(testDir);
    expect(result.success).toBe(false);
    expect(result.error).toContain("No valid skills found");
  });
});

function listZipEntries(zipPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    execFile("unzip", ["-l", zipPath], (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const lines = stdout.split("\n");
      const entries: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip header/footer lines
        if (
          !trimmed ||
          trimmed.startsWith("Length") ||
          trimmed.startsWith("---") ||
          trimmed.startsWith("Archive:")
        ) {
          continue;
        }
        // Skip total summary line like "512 2 files"
        if (trimmed.match(/^\d+\s+\d+\s+files?$/)) {
          continue;
        }
        const parts = trimmed.split(/\s+/);
        const name = parts[parts.length - 1];
        if (name) {
          entries.push(name);
        }
      }
      resolve(entries);
    });
  });
}
