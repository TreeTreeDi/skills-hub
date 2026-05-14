import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../auth";
import { prisma } from "../../lib/prisma";
import { UploadService } from "../../lib/upload-service";
import { parseTags, processUpload } from "../../lib/upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const packageName = formData.get("packageName") as string | null;
    const uploaderName = formData.get("uploaderName") as string | null;
    const uploaderEmail = formData.get("uploaderEmail") as string | null;
    const category = (formData.get("category") as string) || "其他";
    const tagsStr = (formData.get("tags") as string) || "[]";

    if (!file || !packageName || !uploaderName || !uploaderEmail) {
      return NextResponse.json(
        { error: "Missing required fields: file, packageName, uploaderName, uploaderEmail" },
        { status: 400 },
      );
    }

    const tags = parseTags(tagsStr);
    if (!tags) {
      return NextResponse.json({ error: "tags must be a JSON array of strings" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const session = await auth();
    const uploadService = new UploadService(prisma, processUpload);
    const result = await uploadService.upload(
      {
        fileBuffer,
        packageName,
        uploaderName,
        uploaderEmail,
        category,
        tags,
      },
      session?.user?.id,
    );

    if ("type" in result) {
      switch (result.type) {
        case "DUPLICATE_PACKAGE": {
          return NextResponse.json(
            {
              error: `Package "${result.packageName}" already exists. Use "owl upload" and choose Rename to publish under a different name.`,
            },
            { status: 409 },
          );
        }
        case "INVALID_STRUCTURE": {
          return NextResponse.json(
            { error: "Invalid package structure", details: result.details },
            { status: 400 },
          );
        }
        case "EXTRACTION_FAILED": {
          return NextResponse.json({ error: result.message }, { status: 400 });
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
