import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const title: string = body.title;
    const units: string[] = body.units;

    // 🔥 Create course with explicit image null
    const course = await prisma.course.create({
      data: {
        name: title,
        image: null,        // 👈 important
        category: null,     // 👈 optional
        userId: session.user.id,
        units: {
          create: units.map((unitName) => ({
            name: unitName,
          })),
        },
      },
      include: {
        units: true,
      },
    });

    // 🔥 Create dummy chapter per unit
    for (const unit of course.units) {
      await prisma.chapter.create({
        data: {
          name: `${unit.name} - Introduction`,
          youtubeSearchQuery: unit.name,
          unitId: unit.id,
          contentMarkdown: `# ${unit.name}\n\nThis is generated content.`,
          summaryMarkdown: `Summary of ${unit.name}`,
        },
      });
    }

    return NextResponse.json({
      course_id: course.id,
    });
  } catch (error) {
    console.error("CREATE_COURSE_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}