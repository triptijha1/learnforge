import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  courseId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { courseId } = bodySchema.parse(body);

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        userId: session.user.id,
      },
      include: {
        units: {
          include: {
            chapters: {
              include: { questions: true },
            },
          },
        },
      },
    });

    if (!course) {
      return new NextResponse("not found", { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("[GET_COURSE_ERROR]", error);
    return new NextResponse("invalid request", { status: 400 });
  }
}
