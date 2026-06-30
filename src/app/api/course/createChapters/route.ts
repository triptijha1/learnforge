import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { createCourseWithUnits } from "@/services/course.service";
import { prisma } from "@/lib/db"; // 🔥 ADD THIS

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 🔥 ENSURE USER EXISTS IN DB
    const dbUser = await prisma.user.upsert({
  where: { email: session.user.email! },
  update: {},
  create: {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name ?? "",
  },
});

const { title, units } = await req.json();

const course = await createCourseWithUnits(
  title,
  units,
  dbUser.id
);
    return NextResponse.json(course);
  } catch (error) {
    console.error("CREATE_COURSE_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}