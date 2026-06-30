import ConfirmChapters from "@/components/ConfirmChapters";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Info } from "lucide-react";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ courseId: string }> };

export default async function ConfirmCoursePage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId: session.user.id },
    include: {
      units: {
        include: { chapters: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!course) redirect("/create");

  return (
    <div className="flex flex-col items-start max-w-2xl px-6 mx-auto my-16">
      <p className="text-sm uppercase text-secondary-foreground/60">Course name</p>
      <h1 className="text-5xl font-bold">{course.name}</h1>
      <div className="flex p-4 mt-5 bg-secondary rounded-lg">
        <Info className="w-8 h-8 mr-3 shrink-0 text-blue-400" />
        <p>Review the generated chapters, then generate their videos, lessons, summaries, and quizzes.</p>
      </div>
      <ConfirmChapters course={course} />
    </div>
  );
}
