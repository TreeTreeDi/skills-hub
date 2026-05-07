import { describe, it, expect } from "vite-plus/test";
import { parseSource, resolveHubName } from "./source-parser.ts";

describe("parseSource", () => {
  describe("local paths", () => {
    it("resolves absolute path", () => {
      const result = parseSource("/Users/me/skills");
      expect(result).toEqual({
        type: "local",
        url: "/Users/me/skills",
        localPath: "/Users/me/skills",
      });
    });

    it("resolves relative path with ./", () => {
      const result = parseSource("./my-skills");
      expect(result.type).toBe("local");
      expect(result.localPath).toContain("my-skills");
    });

    it("resolves parent path with ../", () => {
      const result = parseSource("../other-skills");
      expect(result.type).toBe("local");
      expect(result.localPath).toContain("other-skills");
    });

    it("resolves current directory", () => {
      const result = parseSource(".");
      expect(result.type).toBe("local");
    });
  });

  describe("github shorthand", () => {
    it("parses owner/repo", () => {
      const result = parseSource("vercel-labs/skills");
      expect(result).toEqual({
        type: "github",
        url: "https://github.com/vercel-labs/skills.git",
      });
    });

    it("parses owner/repo/subpath", () => {
      const result = parseSource("vercel-labs/skills/theme-factory");
      expect(result).toEqual({
        type: "github",
        url: "https://github.com/vercel-labs/skills.git",
        subpath: "theme-factory",
      });
    });

    it("parses owner/repo/deep/subpath", () => {
      const result = parseSource("org/repo/skills/code-review");
      expect(result).toEqual({
        type: "github",
        url: "https://github.com/org/repo.git",
        subpath: "skills/code-review",
      });
    });
  });

  describe("github URLs", () => {
    it("parses https://github.com/owner/repo", () => {
      const result = parseSource("https://github.com/vercel-labs/skills");
      expect(result).toEqual({
        type: "github",
        url: "https://github.com/vercel-labs/skills.git",
      });
    });

    it("parses GitHub URL with tree path", () => {
      const result = parseSource("https://github.com/vercel-labs/skills/tree/main/code-review");
      expect(result).toEqual({
        type: "github",
        url: "https://github.com/vercel-labs/skills.git",
        ref: "main",
        subpath: "code-review",
      });
    });
  });

  describe("hub name", () => {
    it("treats single word as hub name", () => {
      const result = parseSource("demo");
      expect(result).toEqual({
        type: "hub-name",
        url: "demo",
        name: "demo",
      });
    });

    it("treats hyphenated name as hub name", () => {
      const result = parseSource("code-review");
      expect(result).toEqual({
        type: "hub-name",
        url: "code-review",
        name: "code-review",
      });
    });

    it("treats dotted name as hub name", () => {
      const result = parseSource("my.skill-pack");
      expect(result).toEqual({
        type: "hub-name",
        url: "my.skill-pack",
        name: "my.skill-pack",
      });
    });

    it("does not treat owner/repo as hub name", () => {
      const result = parseSource("vercel-labs/skills");
      expect(result.type).toBe("github");
    });

    it("does not treat URLs as hub name", () => {
      const result = parseSource("https://example.com");
      expect(result.type).toBe("well-known");
    });
  });
});

describe("resolveHubName", () => {
  it("resolves hub name to github shorthand path", () => {
    const result = resolveHubName("demo");
    expect(result).toEqual({
      type: "github",
      url: "https://github.com/TreeTreeDi/skills-data.git",
      subpath: "skills/demo",
    });
  });

  it("resolves hyphenated hub name", () => {
    const result = resolveHubName("code-review");
    expect(result).toEqual({
      type: "github",
      url: "https://github.com/TreeTreeDi/skills-data.git",
      subpath: "skills/code-review",
    });
  });
});
