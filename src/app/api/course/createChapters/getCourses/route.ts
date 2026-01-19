export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1️⃣ Auth
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("unauthorized", { status: 401 });
    }

    // 2️⃣ Fetch user's courses (lightweight)
    const courses = await prisma.course.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        image: true,
        category: true,
        createdAt: true,
      },
    });

    // 3️⃣ Return
    return NextResponse.json(courses);
  } catch (error) {
    console.error("[GET_COURSES_ERROR]", error);
    return new NextResponse("internal error", { status: 500 });
  }
}
