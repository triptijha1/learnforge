import type { Course, Unit, Chapter } from "@prisma/client";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  course: Course & {
    units: (Unit & {
      chapters: Chapter[];
    })[];
  };
  currentChapterId: string;
};

const CourseSideBar = ({ course, currentChapterId }: Props) => {
  return (
    <div className="fixed left-0 top-0 h-screen w-[260px] p-5 bg-secondary rounded-r-3xl overflow-y-auto">
      <h1 className="text-4xl font-bold">{course.name}</h1>

      {course.units.map((unit, unitIndex) => (
        <div key={unit.id} className="mt-4">
          <h2 className="text-sm uppercase text-secondary-foreground/60">
            Unit {unitIndex + 1}
          </h2>

          <h2 className="text-2xl font-bold">{unit.name}</h2>

          {unit.chapters.map((chapter, chapterIndex) => (
            <div key={chapter.id}>
              <Link
                href={`/course/${course.id}/${unitIndex}/${chapterIndex}`}
                className={cn("text-secondary-foreground/60", {
                  "text-green-500 font-bold":
                    chapter.id === currentChapterId,
                })}
              >
                {chapter.name}
              </Link>
            </div>
          ))}

          <Separator className="mt-2 bg-gray-500" />
        </div>
      ))}
    </div>
  );
};

export default CourseSideBar;