import { Chapter, Course, Unit } from "@/generated/prisma";
import Image from "next/image";
import Link from "next/link";

type Props = {
  course: Course & {
    units: (Unit & {
      chapters: Chapter[];
    })[];
  };
};


const GalleryCourseCard = ({ course }: Props) => {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur transition hover:scale-[1.02] hover:border-white/20">
      {/* IMAGE */}
      <Link href={`/course/${course.id}/0/0`} className="relative block">
        {course.image ? (
          <Image
            src={course.image}
            alt={course.name}
            width={400}
            height={220}
            className="h-[180px] w-full object-cover"
          />
        ) : (
          <div className="flex h-[180px] w-full items-center justify-center bg-gradient-to-br from-indigo-600/40 to-purple-600/40 text-sm font-semibold">
            No Image
          </div>
        )}

        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-sm text-white">
          {course.name}
        </span>
      </Link>

      {/* CONTENT */}
      <div className="p-4">
        <h4 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Units
        </h4>

        <div className="space-y-1">
          {course.units.map((unit, unitIndex) => (
            <Link
              key={unit.id}
              href={`/course/${course.id}/${unitIndex}/0`}
              className="block text-sm underline-offset-4 hover:underline"
            >
              {unit.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryCourseCard;
