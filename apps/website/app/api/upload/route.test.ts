import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockProcessUpload = vi.fn();

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
  processUpload: (...args: unknown[]) => mockProcessUpload(...args),
}));

describe("POST /api/upload", () => {
  beforeEach(() => {
    mockProcessUpload.mockReset();
  });

  function createRequest(formData: FormData): Request {
    return new Request("http://localhost/api/upload", {
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

  it("returns 409 when package already exists", async () => {
    mockProcessUpload.mockResolvedValue({
      type: "DUPLICATE_PACKAGE",
      packageName: "dup",
    });

    const formData = new FormData();
    formData.append("file", new File([new Blob(["zip"])], "test.zip"));
    formData.append("packageName", "dup");
    formData.append("uploaderName", "test");
    formData.append("uploaderEmail", "test@test.com");
    formData.append("tags", "[]");

    const req = createRequest(formData);
    const res = await POST(req as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already exists");
  });

  it("returns 400 for generic upload errors", async () => {
    mockProcessUpload.mockResolvedValue({
      type: "INVALID_STRUCTURE",
      details: ["No SKILL.md found"],
    });

    const formData = new FormData();
    formData.append("file", new File([new Blob(["zip"])], "test.zip"));
    formData.append("packageName", "bad");
    formData.append("uploaderName", "test");
    formData.append("uploaderEmail", "test@test.com");
    formData.append("tags", "[]");

    const req = createRequest(formData);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful upload", async () => {
    mockProcessUpload.mockResolvedValue({
      prUrl: "https://github.com/pr/1",
      prNumber: 1,
      skills: [{ name: "test", description: "test skill" }],
    });

    const formData = new FormData();
    formData.append("file", new File([new Blob(["zip"])], "test.zip"));
    formData.append("packageName", "good");
    formData.append("uploaderName", "test");
    formData.append("uploaderEmail", "test@test.com");
    formData.append("tags", "[]");

    const req = createRequest(formData);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prUrl).toBe("https://github.com/pr/1");
  });
});
