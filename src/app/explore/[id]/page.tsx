import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ExplorePreviewPage({ params }: PageProps) {
  const course = await prisma.course.findFirst({
    where: {
      id: params.id,
      user: {
        email: "seed@learnforge.dev",
      },
    },
    include: {
      units: {
        include: {
          chapters: true,
        },
      },
    },
  });

  // ❌ Invalid course ID
  if (!course) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-20">
      {/* BACK */}
      <Link
        href="/explore"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Explore
      </Link>

      {/* HERO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* IMAGE */}
        <div className="rounded-2xl overflow-hidden border bg-muted">
          {course.image ? (
            <img
              src={course.image}
              alt={course.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </div>

        {/* INFO */}
        <div>
          <span className="inline-block mb-3 rounded-full bg-primary/10 px-4 py-1 text-sm font-medium">
            {course.category}
          </span>

          <h1 className="text-4xl font-bold tracking-tight">
            {course.name}
          </h1>

          <p className="mt-4 text-muted-foreground">
            This AI-powered course is structured into clear units and chapters,
            complete with videos, summaries, and quizzes.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={`/create?topic=${encodeURIComponent(course.name)}`}
              className="rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Generate Full Course
            </Link>

            <Link
              href="/explore"
              className="rounded-xl border px-8 py-4 font-semibold hover:bg-muted transition"
            >
              Explore More
            </Link>
          </div>
        </div>
      </div>

      {/* WHAT YOU’LL LEARN */}
      <section className="mt-20">
        <h2 className="text-3xl font-bold">
          What you’ll learn
        </h2>

        <div className="mt-10 space-y-8">
          {course.units.map((unit, index) => (
            <div
              key={unit.id}
              className="rounded-2xl border bg-card p-6"
            >
              <h3 className="text-xl font-semibold">
                {index + 1}. {unit.name}
              </h3>

              <ul className="mt-4 list-disc list-inside text-muted-foreground space-y-1">
                {unit.chapters.map((chapter) => (
                  <li key={chapter.id}>{chapter.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="mt-24 rounded-2xl bg-muted/40 p-12 text-center">
        <h3 className="text-2xl font-bold">
          Fully AI-Generated Learning Experience
        </h3>

        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          When you generate this course, AI will create detailed explanations,
          summaries, YouTube videos, and quizzes for every chapter.
        </p>
      </section>
    </div>
  );
}
