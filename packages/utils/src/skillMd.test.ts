import { describe, it, expect } from "vite-plus/test";
import { parseSkillMd, validateSkillMd } from "./skillMd.ts";

describe("parseSkillMd", () => {
  it("parses valid SKILL.md with name and description", () => {
    const content = `---
name: code-review
description: Reviews code for quality and bugs
---

# Code Review

Instructions here.`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      name: "code-review",
      description: "Reviews code for quality and bugs",
      body: "# Code Review\n\nInstructions here.",
    });
  });

  it("returns error when name is missing", () => {
    const content = `---
description: Some description
---

Body`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      error: "Missing required field: name",
    });
  });

  it("returns error when description is missing", () => {
    const content = `---
name: my-skill
---

Body`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      error: "Missing required field: description",
    });
  });

  it("returns error when both name and description are missing", () => {
    const content = `---
---

Body`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      error: "Missing required field: name",
    });
  });

  it("returns error when frontmatter is empty", () => {
    const content = `Body without frontmatter`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      error: "Missing YAML frontmatter",
    });
  });

  it("returns error when name is not a string", () => {
    const content = `---
name: 123
description: Some description
---

Body`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      error: "Field 'name' must be a string",
    });
  });

  it("returns error when description is not a string", () => {
    const content = `---
name: my-skill
description: 456
---

Body`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      error: "Field 'description' must be a string",
    });
  });

  it("handles SKILL.md with no body content", () => {
    const content = `---
name: minimal
description: A minimal skill
---`;

    const result = parseSkillMd(content);
    expect(result).toEqual({
      name: "minimal",
      description: "A minimal skill",
      body: "",
    });
  });
});

describe("validateSkillMd", () => {
  it("returns valid for correct content", () => {
    const content = `---
name: code-review
description: Reviews code
---

# Code Review`;

    const result = validateSkillMd(content);
    expect(result).toEqual({ valid: true });
  });

  it("returns error for missing name", () => {
    const content = `---
description: Some desc
---

Body`;

    const result = validateSkillMd(content);
    expect(result).toEqual({
      valid: false,
      error: "Missing required field: name",
    });
  });

  it("returns error for missing frontmatter", () => {
    const content = `No frontmatter here`;

    const result = validateSkillMd(content);
    expect(result).toEqual({
      valid: false,
      error: "Missing YAML frontmatter",
    });
  });
});
