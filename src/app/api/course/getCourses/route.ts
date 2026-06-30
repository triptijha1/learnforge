import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { fetchCourses } from "@/services/course.service";
import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courses = await fetchCourses(session.user.id);

    return NextResponse.json(courses);
  } catch (error) {
    return apiError(error, "GET_COURSES_ERROR");
  }
}
