import type { PrismaClient } from "@prisma/client";
import { SyncService } from "./sync";

export interface PrStatusInput {
  prNumber: number;
  isMerged: boolean;
  packageName?: string | null;
}

export class PrStatusProcessor {
  constructor(
    private prisma: PrismaClient,
    private syncService: SyncService,
  ) {}

  async process(input: PrStatusInput): Promise<void> {
    if (input.isMerged) {
      if (input.packageName) {
        await this.syncService.syncPackage(input.packageName);
        await this.syncService.rebuildSearchVectors();
      }

      await this.prisma.upload.updateMany({
        where: { prNumber: input.prNumber },
        data: { status: "APPROVED" },
      });
    } else {
      const reviewComment = await this.fetchPrReviewComment(input.prNumber);
      await this.prisma.upload.updateMany({
        where: { prNumber: input.prNumber },
        data: {
          status: "REJECTED",
          reviewComment: reviewComment || undefined,
        },
      });
    }
  }

  private async fetchPrReviewComment(_prNumber: number): Promise<string | null> {
    // In a real implementation, this would call GitHub API to fetch review comments
    // For now, return null as the review comment will be updated manually or via webhook
    return null;
  }
}
