import CourseSideBar from "@/components/CourseSidebar";
import MainVideoSummary from "@/components/MainVideoSummary";
import QuizCards from "@/components/QuizCards";
import { prisma } from "@/lib/db";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { markdownToHtml } from "@/lib/markdownToHtml"; // ✅ fixed import


type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

const CoursePage = async ({ params }: Props) => {
  const { slug } = await params;
  const [courseId, unitIndexParam, chapterIndexParam] = slug;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      units: {
        include: {
          chapters: {
            include: { questions: true },
          },
        },
      },
    },
  });

  if (!course) redirect("/gallery");

  const unitIndex = parseInt(unitIndexParam, 10);
  const chapterIndex = parseInt(chapterIndexParam, 10);

  const unit = course.units[unitIndex];
  if (!unit) redirect("/gallery");

  const chapter = unit.chapters[chapterIndex];
  if (!chapter) redirect("/gallery");

  const prevChapter = unit.chapters[chapterIndex - 1];
  const nextChapter = unit.chapters[chapterIndex + 1];

  // ✅ Correct field names from Prisma schema
  const contentHtml = chapter.contentMarkdown
    ? await markdownToHtml(chapter.contentMarkdown)
    : "";

  const summaryHtml = chapter.summaryMarkdown
    ? await markdownToHtml(chapter.summaryMarkdown)
    : "";

  return (
    <div className="flex">
      {/* SIDEBAR */}
      <CourseSideBar
        course={course}
        currentChapterId={chapter.id}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-[320px] px-10 py-8 max-w-4xl">
        {/* VIDEO + CONTENT + SUMMARY */}
        <MainVideoSummary 
          chapter={chapter}
          contentHtml={contentHtml}
          summaryHtml={summaryHtml}
        />

        {/* QUIZ */}
        <div className="mt-12">
          <QuizCards chapter={chapter} />
        </div>

        {/* NAVIGATION */}
        <div className="flex justify-between mt-12 pt-6 border-t">
          {prevChapter ? (
            <Link
              href={`/course/${course.id}/${unitIndex}/${chapterIndex - 1}`}
              className="flex items-center gap-2"
            >
              <ChevronLeft />
              <span>{prevChapter.name}</span>
            </Link>
          ) : <div />}

          {nextChapter && (
            <Link
              href={`/course/${course.id}/${unitIndex}/${chapterIndex + 1}`}
              className="flex items-center gap-2"
            >
              <span>{nextChapter.name}</span>
              <ChevronRight />
            </Link>
          )}
        </div>
      </main>
    </div>
  );
};

export default CoursePage;
