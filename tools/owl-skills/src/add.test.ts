import { describe, it, expect } from "vite-plus/test";
import { parseSource, resolveHubName } from "./source-parser.ts";

// The add command is now fully interactive (uses @clack/prompts).
// Integration tests for `owl add` should be done via E2E, not unit tests.
// We test the core logic (source parsing, hub name resolution) here instead.

describe("add command support", () => {
  describe("source parsing for add", () => {
    it("parses hub name for short skill names", () => {
      const result = parseSource("hello");
      expect(result.type).toBe("hub-name");
      expect(result.name).toBe("hello");
    });

    it("parses owner/repo as GitHub source", () => {
      const result = parseSource("vercel-labs/agent-skills");
      expect(result.type).toBe("github");
    });

    it("parses local paths", () => {
      const result = parseSource("/tmp/my-skills");
      expect(result.type).toBe("local");
    });
  });

  describe("hub name resolution", () => {
    it("resolves hub name to GitHub shorthand with subpath", () => {
      const result = resolveHubName("hello");
      expect(result.type).toBe("github");
      expect(result.url).toContain("TreeTreeDi/skills-data");
      expect(result.subpath).toBe("skills/hello");
    });
  });
});
