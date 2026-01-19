import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";

const bodySchema = z.object({
  chapterId: z.string(),
});

export async function POST(req: Request) {
  try {
    // 1️⃣ Auth
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("unauthorized", { status: 401 });
    }

    // 2️⃣ Validate body
    const body = await req.json();
    const { chapterId } = bodySchema.parse(body);

    // 3️⃣ Fetch chapter WITH ownership check
    const chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        unit: {
          course: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    // 4️⃣ Success
    return NextResponse.json(chapter);

  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
