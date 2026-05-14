import { createHmac } from "node:crypto";
import { prisma } from "../../../lib/prisma";
import { SyncService } from "../../../lib/sync";
import { PrStatusProcessor } from "../../../lib/pr-status-processor";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const hmac = createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(payload);
  const digest = "sha256=" + hmac.digest("hex");
  return digest === signature;
}

function extractPackageNameFromPr(title: string, body?: string): string | null {
  const match = title.match(/add\s+package[:\s]+(\S+)/i);
  if (match) return match[1]!;

  if (body) {
    const bodyMatch = body.match(/package[_\s-]?name[:\s]+(\S+)/i);
    if (bodyMatch) return bodyMatch[1]!;
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const signature = request.headers.get("x-hub-signature-256") || "";
    const eventType = request.headers.get("x-github-event") || "";
    const payload = await request.text();

    if (!verifySignature(payload, signature)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(payload);

    if (eventType === "pull_request") {
      const action = data.action;
      const pr = data.pull_request;

      if (action === "closed") {
        const packageName = extractPackageNameFromPr(pr.title, pr.body);
        const processor = new PrStatusProcessor(prisma, new SyncService(prisma));
        await processor.process({
          prNumber: pr.number,
          isMerged: pr.merged === true,
          packageName,
        });
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
