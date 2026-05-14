import { prisma } from "../../lib/prisma";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { packageName, skillName } = body;

    if (!packageName || typeof packageName !== "string") {
      return Response.json({ error: "packageName is required" }, { status: 400 });
    }

    const pkg = await prisma.package.findUnique({
      where: { slug: packageName },
      include: { skills: true },
    });

    if (!pkg) {
      return Response.json({ error: "Package not found" }, { status: 404 });
    }

    let skillId: string | undefined;
    if (skillName && typeof skillName === "string") {
      const skill = pkg.skills.find((s) => s.name === skillName || s.slug === skillName);
      if (skill) {
        skillId = skill.id;
      }
    }

    await prisma.$transaction([
      prisma.installEvent.create({
        data: {
          packageId: pkg.id,
          skillId,
        },
      }),
      prisma.package.update({
        where: { id: pkg.id },
        data: { installs: { increment: 1 } },
      }),
      ...(skillId
        ? [
            prisma.skill.update({
              where: { id: skillId },
              data: { installs: { increment: 1 } },
            }),
          ]
        : []),
    ]);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to track install" }, { status: 500 });
  }
}
