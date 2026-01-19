import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  courseId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { courseId } = bodySchema.parse(body);

    // Ensure user owns the course
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        userId: session.user.id,
      },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE_COURSE_ERROR]", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
