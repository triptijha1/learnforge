import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getOrGenerateChapter } from "@/services/chapter.service";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { chapterId } = await req.json();

    const result = await getOrGenerateChapter(
      chapterId,
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("CHAPTER_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}