import { prisma } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ExplorePage() {
  const session = await getServerSession(authOptions);

  const courses = await prisma.course.findMany({
    where: {
      user: { email: "seed@learnforge.dev" },
    },
    orderBy: { category: "asc" },
    select: {
      id: true,
      name: true,
      image: true,
      category: true,
    },
  });

  let lastCategory: string | null = null;

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6 space-y-16">
        <h1 className="text-4xl font-bold text-center">
          Explore Courses
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => {
            const showCategory = course.category !== lastCategory;
            lastCategory = course.category;

            return (
              <div key={course.id} className="space-y-3">
                {showCategory && (
                  <h2 className="text-xl font-bold mt-10">
                    {course.category}
                  </h2>
                )}

                <div className="h-[320px] rounded-2xl overflow-hidden bg-card border hover:scale-[1.03] transition">
                  <Link href={`/explore/${course.id}`}>
                    <div className="h-[160px] bg-muted">
                      <img
                        src={course.image || "https://images.unsplash.com/photo-1677442136019-21780ecad995"}
                        alt={course.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </Link>

                  <div className="p-4 flex flex-col justify-between h-[160px]">
                    <h3 className="font-semibold leading-tight">
                      {course.name}
                    </h3>

                    {session ? (
                      <Link
                        href={`/create?topic=${encodeURIComponent(course.name)}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Generate Course →
                      </Link>
                    ) : (
                      <Link
                        href="/api/auth/signin"
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Sign in to generate →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA — KEEP */}
        <section className="rounded-3xl bg-muted/40 p-14 text-center mt-24">
          <h2 className="text-4xl font-bold">
            Want a custom course?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Pick any topic and let AI build a full course for you.
          </p>

          <Link
            href="/create"
            className="inline-block mt-8 rounded-xl bg-primary px-10 py-4 font-semibold text-primary-foreground"
          >
            Create Your Own Course
          </Link>
        </section>
      </div>
    </div>
  );
}
