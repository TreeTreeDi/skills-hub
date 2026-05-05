import { describe, it, expect } from "vitest";
import { extractZip, parseTags, collectSkills } from "./upload";
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

  it("handles files without parent directory", () => {
    const zip = new AdmZip();
    zip.addFile("standalone.txt", Buffer.from("data"));
    const buffer = zip.toBuffer();

    const files = extractZip(buffer);
    expect(files.has("standalone.txt")).toBe(true);
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

  it("returns empty when no SKILL.md exists", () => {
    const files = new Map<string, Buffer>([["README.md", Buffer.from("hello")]]);

    expect(collectSkills(files)).toEqual([]);
  });
});
