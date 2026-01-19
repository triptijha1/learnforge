import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createChapterSchema } from "@/validators/course";
import { getUnsplashImage } from "@/lib/unsplash";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { generateWithOllama } from "@/lib/ollama";

/* -------------------- TYPES -------------------- */

type OutputUnits = {
  title: string;
  chapters: {
    youtube_search_query: string;
    chapter_title: string;
  }[];
}[];

/* -------------------- OLLAMA HELPERS -------------------- */

async function generateUnits(title: string, units: string[]): Promise<OutputUnits> {
  const prompt = `
Return ONLY valid JSON. No text outside JSON.

Create ${units.length} units for a course titled "${title}".

Format:
[
  {
    "title": "Unit Title",
    "chapters": [
      {
        "chapter_title": "Chapter Title",
        "youtube_search_query": "YouTube search query"
      }
    ]
  }
]

Rules:
- Use keys exactly: title, chapters, chapter_title, youtube_search_query
- If unsure about youtube query, still return a short reasonable phrase
`;

  const raw = await generateWithOllama(prompt);

  // Try normal parse
  try {
    return JSON.parse(raw) as OutputUnits;
  } catch {}

  // Fallback repair mode
  try {
    // Extract JSON array even if model added text
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array");

    const parsed = JSON.parse(match[0]);

    // 🔒 Guarantee every chapter has a youtube_search_query
    for (const unit of parsed) {
      for (const chapter of unit.chapters) {
        if (!chapter.youtube_search_query || typeof chapter.youtube_search_query !== "string") {
          // fallback safe query using chapter title
          chapter.youtube_search_query = chapter.chapter_title;
        }
      }
    }

    return parsed as OutputUnits;
  } catch (err) {
    console.error("AI JSON repair failed:", raw);

    // 🔒 Absolute fallback: build structure from units input
    return units.map((u) => ({
      title: u,
      chapters: [
        {
          chapter_title: `${title} Introduction`,
          youtube_search_query: `${title} introduction`,
        },
      ],
    })) as OutputUnits;
  }
}


async function generateImageSearchTerm(title: string): Promise<string> {
  const prompt = `
Give one short Unsplash search term for a course titled "${title}".
Return ONLY the search term text. No extra words.
`;
  const raw = await generateWithOllama(prompt);
  return raw.trim();
}

/* -------------------- ROUTE -------------------- */

export async function POST(req: Request) {
  try {
    // 1️⃣ Auth
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("unauthorized", { status: 401 });
    }

    // 2️⃣ Validate body
    const body = await req.json();
    const { title, units } = createChapterSchema.parse(body);

    // 3️⃣ Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return new NextResponse("user not found", { status: 404 });
    }

    // 4️⃣ AI: Generate units + chapters using Ollama
    const output_units = await generateUnits(title, units);

    // 5️⃣ AI: Generate Unsplash search term
    const imageSearchTerm = await generateImageSearchTerm(title);

    const courseImage =
      (await getUnsplashImage(imageSearchTerm)) ?? "";

    // 6️⃣ ATOMIC TRANSACTION
    const course = await prisma.$transaction(async (tx) => {
      // Credit check + decrement
      const updatedUser = await tx.user.updateMany({
        where: {
          id: user.id,
          credits: { gt: 0 },
        },
        data: {
          credits: { decrement: 1 },
        },
      });

      if (updatedUser.count === 0) {
        throw new Error("NO_CREDITS");
      }

      // Create course
      const createdCourse = await tx.course.create({
        data: {
          name: title,
          image: courseImage,
          userId: user.id,
        },
      });

      // Create units & chapters
      for (const unit of output_units) {
        const prismaUnit = await tx.unit.create({
          data: {
            name: unit.title,
            courseId: createdCourse.id,
          },
        });

        await tx.chapter.createMany({
          data: unit.chapters.map((chapter) => ({
            name: chapter.chapter_title,
            youtubeSearchQuery: chapter.youtube_search_query,
            unitId: prismaUnit.id,
          })),
        });
      }

      return createdCourse;
    });

    // 7️⃣ Success
    return NextResponse.json({ course_id: course.id });

  } catch (error) {
    if (error instanceof ZodError) {
      return new NextResponse("invalid body", { status: 400 });
    }

    if (error instanceof Error && error.message === "NO_CREDITS") {
      return new NextResponse("no credits", { status: 402 });
    }

    if (error instanceof Error && error.message === "INVALID_AI_OUTPUT") {
      return new NextResponse("ai output parse error", { status: 500 });
    }

    console.error("[CREATE_CHAPTERS_ERROR]", error);
    return new NextResponse("internal error", { status: 500 });
  }
}
