import { NextRequest, NextResponse } from "next/server";
import { createOctokitClient } from "../../../lib/github-octokit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const packageName = searchParams.get("packageName");

  if (!packageName) {
    return NextResponse.json({ error: "Missing packageName parameter" }, { status: 400 });
  }

  try {
    const client = createOctokitClient();
    const { name: defaultBranch } = await client.getDefaultBranch();
    const exists = await client.treeExists(`skills/${packageName}`, defaultBranch);
    return NextResponse.json({ exists, packageName });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
