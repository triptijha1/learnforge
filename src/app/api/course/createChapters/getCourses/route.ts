import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // 1️⃣ Auth
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("unauthorized", { status: 401 });
    }

    // 2️⃣ Fetch courses owned by user
    const courses = await prisma.course.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        units: {
          include: {
            chapters: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 3️⃣ Success
    return NextResponse.json(courses);
  } catch (error) {
    console.error("[GET_COURSES_ERROR]", error);
    return new NextResponse("internal error", { status: 500 });
  }
}
