import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { fetchCourses } from "@/services/course.service";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const courses = await fetchCourses(session.user.id);

    return NextResponse.json(courses);
  } catch (error) {
    console.error("GET_COURSES_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}