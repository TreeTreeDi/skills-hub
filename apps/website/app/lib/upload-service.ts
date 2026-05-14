import type { PrismaClient } from "@prisma/client";
import type { UploadInput, UploadResult, UploadError } from "./upload";

export class UploadService {
  constructor(
    private prisma: Pick<PrismaClient, "upload">,
    private processUpload: (input: UploadInput) => Promise<UploadResult | UploadError>,
  ) {}

  async upload(
    input: UploadInput,
    userId?: string,
  ): Promise<UploadResult | UploadError> {
    const result = await this.processUpload(input);

    if ("prUrl" in result && userId) {
      await this.prisma.upload.create({
        data: {
          packageName: input.packageName,
          prNumber: result.prNumber,
          prUrl: result.prUrl,
          userId,
          status: "PENDING",
        },
      });
    }

    return result;
  }
}
