import CourseSideBar from "@/components/CourseSidebar";
import MainVideoSummary from "@/components/MainVideoSummary";
import QuizCards from "@/components/QuizCards";
import { prisma } from "@/lib/db";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { markdownToHtml } from "@/lib/markdownToHtml";

type Props = {
  params: {
    slug: string[];
  };
};

const CoursePage = async ({ params }: Props) => {
  // ✅ Await works but typing matches Next.js PageProps
  const { slug } = await Promise.resolve(params);
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

  const unitIndex = Number(unitIndexParam);
  const chapterIndex = Number(chapterIndexParam);

  const unit = course.units[unitIndex];
  if (!unit) redirect("/gallery");

  const chapter = unit.chapters[chapterIndex];
  if (!chapter) redirect("/gallery");

  const prevChapter = unit.chapters[chapterIndex - 1];
  const nextChapter = unit.chapters[chapterIndex + 1];

  const contentHtml = chapter.contentMarkdown
    ? await markdownToHtml(chapter.contentMarkdown)
    : "";

  const summaryHtml = chapter.summaryMarkdown
    ? await markdownToHtml(chapter.summaryMarkdown)
    : "";

  return (
    <div className="flex">
      <CourseSideBar course={course} currentChapterId={chapter.id} />

      <main className="flex-1 ml-[320px] px-10 py-8 max-w-4xl">
        <MainVideoSummary
          chapter={chapter}
          contentHtml={contentHtml}
          summaryHtml={summaryHtml}
        />

        <div className="mt-12">
          <QuizCards chapter={chapter} />
        </div>

        <div className="flex justify-between mt-12 pt-6 border-t">
          {prevChapter ? (
            <Link
              href={`/course/${course.id}/${unitIndex}/${chapterIndex - 1}`}
              className="flex items-center gap-2"
            >
              <ChevronLeft />
              <span>{prevChapter.name}</span>
            </Link>
          ) : (
            <div />
          )}

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
