import { describe, it, expect, vi } from "vitest";
import { UploadService } from "./upload-service";
import type { UploadInput, UploadResult, UploadError } from "./upload";

type MockPrisma = {
  upload: {
    create: ReturnType<typeof vi.fn>;
  };
};

function createMockPrisma(): MockPrisma {
  return {
    upload: {
      create: vi.fn(),
    },
  };
}

function createMockProcessUpload() {
  return vi.fn<(_: UploadInput) => Promise<UploadResult | UploadError>>();
}

describe("UploadService", () => {
  it("creates a PENDING upload record after successful PR creation", async () => {
    const prisma = createMockPrisma();
    const processUpload = createMockProcessUpload();
    const service = new UploadService(
      prisma as unknown as Parameters<typeof UploadService.prototype.constructor>[0],
      processUpload,
    );

    const uploadResult: UploadResult = {
      prUrl: "https://github.com/TreeTreeDi/skills-data/pull/42",
      prNumber: 42,
      skills: [{ name: "test-skill", description: "A test skill" }],
    };
    processUpload.mockResolvedValue(uploadResult);

    const input: UploadInput = {
      fileBuffer: Buffer.from("zip"),
      packageName: "hello-world",
      uploaderName: "Alice",
      uploaderEmail: "alice@example.com",
      category: "其他",
      tags: ["cli"],
    };
    const userId = "user-cuid-123";

    const result = await service.upload(input, userId);

    expect(result).toEqual(uploadResult);
    expect(prisma.upload.create).toHaveBeenCalledWith({
      data: {
        packageName: "hello-world",
        prNumber: 42,
        prUrl: "https://github.com/TreeTreeDi/skills-data/pull/42",
        userId,
        status: "PENDING",
      },
    });
  });

  it("does not create a record when PR creation fails", async () => {
    const prisma = createMockPrisma();
    const processUpload = createMockProcessUpload();
    const service = new UploadService(
      prisma as unknown as Parameters<typeof UploadService.prototype.constructor>[0],
      processUpload,
    );

    const errorResult: UploadError = {
      type: "DUPLICATE_PACKAGE",
      packageName: "hello-world",
    };
    processUpload.mockResolvedValue(errorResult);

    const input: UploadInput = {
      fileBuffer: Buffer.from("zip"),
      packageName: "hello-world",
      uploaderName: "Alice",
      uploaderEmail: "alice@example.com",
      category: "其他",
      tags: ["cli"],
    };

    const result = await service.upload(input, "user-cuid-123");

    expect(result).toEqual(errorResult);
    expect(prisma.upload.create).not.toHaveBeenCalled();
  });

  it("does not create a record when userId is not provided", async () => {
    const prisma = createMockPrisma();
    const processUpload = createMockProcessUpload();
    const service = new UploadService(
      prisma as unknown as Parameters<typeof UploadService.prototype.constructor>[0],
      processUpload,
    );

    const uploadResult: UploadResult = {
      prUrl: "https://github.com/TreeTreeDi/skills-data/pull/42",
      prNumber: 42,
      skills: [{ name: "test-skill", description: "A test skill" }],
    };
    processUpload.mockResolvedValue(uploadResult);

    const input: UploadInput = {
      fileBuffer: Buffer.from("zip"),
      packageName: "hello-world",
      uploaderName: "Alice",
      uploaderEmail: "alice@example.com",
      category: "其他",
      tags: ["cli"],
    };

    const result = await service.upload(input);

    expect(result).toEqual(uploadResult);
    expect(prisma.upload.create).not.toHaveBeenCalled();
  });
});
