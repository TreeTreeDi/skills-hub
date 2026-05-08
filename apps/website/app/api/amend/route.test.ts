import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockProcessAmend = vi.fn();

vi.mock("../../lib/upload", () => ({
  parseTags: vi.fn().mockImplementation((raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed.map(String);
    } catch {
      return null;
    }
  }),
  processAmend: (...args: unknown[]) => mockProcessAmend(...args),
}));

describe("POST /api/amend", () => {
  beforeEach(() => {
    mockProcessAmend.mockReset();
  });

  function createRequest(formData: FormData): Request {
    return new Request("http://localhost/api/amend", {
      method: "POST",
      body: formData,
    }) as Request;
  }

  it("returns 400 when required fields are missing", async () => {
    const formData = new FormData();
    const req = createRequest(formData);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 404 when package does not exist", async () => {
    mockProcessAmend.mockResolvedValue({
      type: "PACKAGE_NOT_FOUND",
      packageName: "nonexistent",
    });

    const formData = new FormData();
    formData.append("file", new File([new Blob(["zip"])], "test.zip"));
    formData.append("packageName", "nonexistent");
    formData.append("uploaderName", "test");
    formData.append("uploaderEmail", "test@test.com");
    formData.append("tags", "[]");

    const req = createRequest(formData);
    const res = await POST(req as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("does not exist");
  });

  it("returns 200 with noChanges when no diff detected", async () => {
    mockProcessAmend.mockResolvedValue({
      type: "NO_CHANGES",
      packageName: "my-package",
    });

    const formData = new FormData();
    formData.append("file", new File([new Blob(["zip"])], "test.zip"));
    formData.append("packageName", "my-package");
    formData.append("uploaderName", "test");
    formData.append("uploaderEmail", "test@test.com");
    formData.append("tags", "[]");

    const req = createRequest(formData);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.noChanges).toBe(true);
  });

  it("returns 200 on successful amend", async () => {
    mockProcessAmend.mockResolvedValue({
      prUrl: "https://github.com/pr/2",
      prNumber: 2,
      skills: [{ name: "test", description: "test skill" }],
      addedPaths: ["new-file.ts"],
      modifiedPaths: ["SKILL.md"],
    });

    const formData = new FormData();
    formData.append("file", new File([new Blob(["zip"])], "test.zip"));
    formData.append("packageName", "my-package");
    formData.append("uploaderName", "test");
    formData.append("uploaderEmail", "test@test.com");
    formData.append("tags", "[]");

    const req = createRequest(formData);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prUrl).toBe("https://github.com/pr/2");
    expect(body.addedPaths).toEqual(["new-file.ts"]);
    expect(body.modifiedPaths).toEqual(["SKILL.md"]);
  });
});