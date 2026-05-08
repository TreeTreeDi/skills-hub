import { describe, it, expect, vi } from "vitest";
import { extractZip, parseTags, collectSkills, processUpload } from "./upload";
import type { GitHubClient } from "./github";
import AdmZip from "adm-zip";

describe("parseTags", () => {
  it("parses valid JSON array", () => {
    expect(parseTags('["a","b"]')).toEqual(["a", "b"]);
  });

  it("returns null for invalid JSON", () => {
    expect(parseTags("not json")).toBeNull();
  });

  it("returns null for non-array", () => {
    expect(parseTags('"just a string"')).toBeNull();
  });

  it("handles empty array", () => {
    expect(parseTags("[]")).toEqual([]);
  });
});

describe("extractZip", () => {
  function createZip(files: Record<string, string>): Buffer {
    const zip = new AdmZip();
    for (const [path, content] of Object.entries(files)) {
      zip.addFile(path, Buffer.from(content));
    }
    return zip.toBuffer();
  }

  it("extracts files from zip", () => {
    const buffer = createZip({
      "my-package/SKILL.md": "content",
      "my-package/helper.ts": "code",
    });

    const files = extractZip(buffer);
    expect(files.has("SKILL.md")).toBe(true);
    expect(files.has("helper.ts")).toBe(true);
  });

  it("strips top-level directory", () => {
    const buffer = createZip({
      "top-level/nested/file.txt": "data",
    });

    const files = extractZip(buffer);
    expect(files.has("nested/file.txt")).toBe(true);
    expect(files.has("top-level/nested/file.txt")).toBe(false);
  });

  it("rejects zip with no top-level directory", () => {
    const zip = new AdmZip();
    zip.addFile("standalone.txt", Buffer.from("data"));
    const buffer = zip.toBuffer();

    expect(() => extractZip(buffer)).toThrow("exactly one top-level directory");
  });

  it("rejects zip with multiple top-level directories", () => {
    const buffer = createZip({
      "dir-a/file.txt": "a",
      "dir-b/file.txt": "b",
    });

    expect(() => extractZip(buffer)).toThrow("exactly one top-level directory");
  });
});

describe("collectSkills", () => {
  it("collects skills from SKILL.md files", () => {
    const files = new Map<string, Buffer>([
      ["skill-a/SKILL.md", Buffer.from("---\nname: skill-a\ndescription: does A\n---\nbody")],
      ["skill-b/SKILL.md", Buffer.from("---\nname: skill-b\ndescription: does B\n---\nbody")],
      ["skill-a/helper.ts", Buffer.from("code")],
    ]);

    const skills = collectSkills(files);
    expect(skills).toHaveLength(2);
    expect(skills[0]).toEqual({ name: "skill-a", description: "does A" });
    expect(skills[1]).toEqual({ name: "skill-b", description: "does B" });
  });

  it("skips invalid SKILL.md files", () => {
    const files = new Map<string, Buffer>([
      ["bad/SKILL.md", Buffer.from("no frontmatter")],
      ["good/SKILL.md", Buffer.from("---\nname: good\ndescription: ok\n---\nbody")],
    ]);

    const skills = collectSkills(files);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("good");
  });
});

describe("processUpload", () => {
  function createZip(files: Record<string, string>): Buffer {
    const zip = new AdmZip();
    for (const [path, content] of Object.entries(files)) {
      zip.addFile(path, Buffer.from(content));
    }
    return zip.toBuffer();
  }

  function createMockClient(overrides: Record<string, unknown> = {}): GitHubClient {
    return {
      getDefaultBranch: vi.fn().mockResolvedValue({ sha: "abc123", name: "main" }),
      createBranch: vi.fn().mockResolvedValue(undefined),
      createTree: vi.fn().mockResolvedValue("tree-sha"),
      createCommit: vi.fn().mockResolvedValue("commit-sha"),
      updateRef: vi.fn().mockResolvedValue(undefined),
      createPullRequest: vi.fn().mockResolvedValue({ url: "https://pr.url", number: 1 }),
      treeExists: vi.fn().mockResolvedValue(false),
      ...overrides,
    } as GitHubClient;
  }

  it("returns 409 when package already exists", async () => {
    const client = createMockClient({
      treeExists: vi.fn().mockResolvedValue(true),
    });

    const zip = createZip({
      "my-package/SKILL.md": "---\nname: test\ndescription: test skill\n---\n",
    });

    const result = await processUpload(
      {
        fileBuffer: zip,
        packageName: "my-package",
        uploaderName: "test",
        uploaderEmail: "test@test.com",
        category: "test",
        tags: [],
      },
      client,
    );

    expect("type" in result).toBe(true);
    expect(result).toEqual({
      type: "DUPLICATE_PACKAGE",
      packageName: "my-package",
    });
  });

  it("proceeds to create PR when package does not exist", async () => {
    const client = createMockClient({
      treeExists: vi.fn().mockResolvedValue(false),
    });

    const zip = createZip({
      "my-package/SKILL.md": "---\nname: test\ndescription: test skill\n---\n",
    });

    const result = await processUpload(
      {
        fileBuffer: zip,
        packageName: "my-package",
        uploaderName: "test",
        uploaderEmail: "test@test.com",
        category: "test",
        tags: [],
      },
      client,
    );

    expect("type" in result).toBe(false);
    expect(result).toEqual({
      prUrl: "https://pr.url",
      prNumber: 1,
      skills: [{ name: "test", description: "test skill" }],
    });
  });
});
