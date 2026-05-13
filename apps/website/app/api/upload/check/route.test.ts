import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockTreeExists = vi.fn();
const mockGetDefaultBranch = vi.fn();

vi.mock("../../../lib/github-octokit", () => ({
  createOctokitClient: () => ({
    treeExists: mockTreeExists,
    getDefaultBranch: mockGetDefaultBranch,
  }),
}));

describe("GET /api/upload/check", () => {
  beforeEach(() => {
    mockTreeExists.mockReset();
    mockGetDefaultBranch.mockReset();
    mockGetDefaultBranch.mockResolvedValue({ sha: "abc123", name: "main" });
  });

  function createRequest(url: string): Request {
    return new Request(url);
  }

  it("returns 400 when packageName is missing", async () => {
    const req = createRequest("http://localhost/api/upload/check");
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("packageName");
  });

  it("returns { exists: true } when package already exists", async () => {
    mockTreeExists.mockResolvedValue(true);

    const req = createRequest("http://localhost/api/upload/check?packageName=frontend-kit");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(true);
    expect(body.packageName).toBe("frontend-kit");
  });

  it("returns { exists: false } when package does not exist", async () => {
    mockTreeExists.mockResolvedValue(false);

    const req = createRequest("http://localhost/api/upload/check?packageName=new-package");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(false);
    expect(body.packageName).toBe("new-package");
  });

  it("checks the correct path under skills/", async () => {
    mockTreeExists.mockResolvedValue(false);

    const req = createRequest("http://localhost/api/upload/check?packageName=my-skill");
    await GET(req as any);
    expect(mockTreeExists).toHaveBeenCalledWith("skills/my-skill", "main");
  });

  it("returns 500 when GitHub client throws", async () => {
    mockTreeExists.mockRejectedValue(new Error("API rate limit"));

    const req = createRequest("http://localhost/api/upload/check?packageName=broken");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });
});
