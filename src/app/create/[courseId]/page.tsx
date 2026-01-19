import ConfirmChapters from "@/components/ConfirmChapters";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Info } from "lucide-react";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    courseId: string;
  }>;
};

const CreateChapters = async ({ params }: Props) => {
  const { courseId } = await params; // ✅ Next.js 15 requires await params

  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/gallery");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      units: {
        include: { chapters: true },
      },
    },
  });

  if (!course) {
    redirect("/create");
  }

  return (
    <div className="flex flex-col items-start max-w-xl mx-auto my-16">
      <h5 className="text-sm uppercase text-secondary-foreground/60">
        Course Name
      </h5>

      <h1 className="text-5xl font-bold">{course.name}</h1>

      <div className="flex p-4 mt-5 bg-secondary rounded">
        <Info className="w-6 h-6 mr-3 text-blue-400" />
        <div>
          We generated chapters for each unit. Review and continue.
        </div>
      </div>

      <ConfirmChapters course={course} />
    </div>
  );
};

export default CreateChapters;
