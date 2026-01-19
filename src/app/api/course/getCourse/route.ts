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

    await prisma.course.deleteMany({
      where: {
        id: courseId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse("invalid request", { status: 400 });
  }
}
