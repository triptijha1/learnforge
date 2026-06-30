import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { enrichChapter } from "@/services/chapter.service";
import { chapterInfoSchema } from "@/validators/course";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { chapterId } = chapterInfoSchema.parse(await req.json());
    const chapter = await enrichChapter(chapterId, session.user.id);
    return NextResponse.json(chapter);
  } catch (error) {
    return apiError(error, "ENRICH_CHAPTER_ERROR");
  }
}
