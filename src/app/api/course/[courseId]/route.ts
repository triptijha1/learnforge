import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { fetchCourse } from "@/services/course.service";

type Context = { params: Promise<{ courseId: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { courseId } = await params;
    const course = await fetchCourse(courseId, session.user.id);
    return NextResponse.json(course);
  } catch (error) {
    return apiError(error, "GET_COURSE_ERROR");
  }
}
