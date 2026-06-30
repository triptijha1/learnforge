"use client";

import type { Chapter, Course, Unit } from "@prisma/client";
import React from "react";
import ChapterCard, { ChapterCardHandler } from "./ChapterCard";
import { Separator } from "./ui/separator";
import Link from "next/link";
import { Button, buttonVariants } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  course: Course & { units: (Unit & { chapters: Chapter[] })[] };
};

export default function ConfirmChapters({ course }: Props) {
  const chapterRefs = React.useRef<Record<string, ChapterCardHandler | null>>({});
  const [loading, setLoading] = React.useState(false);
  const [completedChapters, setCompletedChapters] = React.useState<Set<string>>(
    () => new Set()
  );
  const chapters = React.useMemo(
    () => course.units.flatMap((unit) => unit.chapters),
    [course.units]
  );
  const allComplete = chapters.length > 0 && completedChapters.size === chapters.length;

  async function generateAll() {
    setLoading(true);
    const queue = chapters.map((chapter) => chapter.id);
    let cursor = 0;

    async function worker() {
      while (cursor < queue.length) {
        const chapterId = queue[cursor++];
        try {
          await chapterRefs.current[chapterId]?.triggerLoad();
        } catch {
          // ChapterCard shows the actionable error and remains retryable.
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(2, queue.length) }, worker));
    setLoading(false);
  }

  return (
    <div className="w-full mt-4">
      {course.units.map((unit, unitIndex) => (
        <div key={unit.id} className="mt-5">
          <p className="text-sm uppercase text-secondary-foreground/60">Unit {unitIndex + 1}</p>
          <h2 className="text-2xl font-bold">{unit.name}</h2>
          <div className="mt-3">
            {unit.chapters.map((chapter, chapterIndex) => (
              <ChapterCard
                key={chapter.id}
                ref={(handler) => { chapterRefs.current[chapter.id] = handler; }}
                chapter={chapter}
                chapterIndex={chapterIndex}
                completedChapters={completedChapters}
                setCompletedChapters={setCompletedChapters}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-center mt-6">
        <Separator className="flex-1" />
        <div className="flex items-center mx-4">
          <Link href="/create" className={buttonVariants({ variant: "secondary" })}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Link>
          {allComplete ? (
            <Link href={`/course/${course.id}/0/0`} className={buttonVariants({ className: "ml-4" })}>
              Save & Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          ) : (
            <Button className="ml-4" disabled={loading || chapters.length === 0} onClick={generateAll}>
              {loading ? "Generating..." : "Generate content"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}
