import { NextRequest, NextResponse } from "next/server";
import { parseTags, processAmend } from "../../lib/upload";

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
    const result = await processAmend({
      fileBuffer,
      packageName,
      uploaderName,
      uploaderEmail,
      category,
      tags,
    });

    if ("type" in result) {
      switch (result.type) {
        case "PACKAGE_NOT_FOUND": {
          return NextResponse.json(
            {
              error: `Package "${result.packageName}" does not exist. Use upload to create it first.`,
            },
            { status: 404 },
          );
        }
        case "NO_CHANGES": {
          return NextResponse.json(
            {
              message: `No changes detected for package "${result.packageName}".`,
              noChanges: true,
            },
            { status: 200 },
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
    console.error("Amend error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
