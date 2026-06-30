import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { deleteCourse } from "@/services/course.service";
import { courseIdSchema } from "@/validators/course";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { courseId } = courseIdSchema.parse(await req.json());
    await deleteCourse(courseId, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "DELETE_COURSE_ERROR");
  }
}
