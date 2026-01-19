"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  name: string;
  image: string | null;
  category: string | null;
  createdAt: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=1200&auto=format&fit=crop";

export default function GalleryPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH COURSES ---------------- */
  useEffect(() => {
    const fetchCourses = async () => {
      const res = await fetch("/api/course/getCourses");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCourses(data);
      setLoading(false);
    };

    fetchCourses();
  }, []);

  /* ---------------- DELETE COURSE ---------------- */
  const deleteCourse = async (courseId: string) => {
    const confirmed = confirm("Are you sure you want to delete this course?");
    if (!confirmed) return;

    const res = await fetch("/api/course/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });

    if (!res.ok) {
      alert("Failed to delete course");
      return;
    }

    // remove from UI immediately
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  /* ---------------- LOADING STATE ---------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-muted-foreground">
        Loading your courses...
      </div>
    );
  }

  /* ---------------- EMPTY STATE ---------------- */
  if (courses.length === 0) {
    return (
      <div className="px-8 py-16 max-w-5xl mx-auto text-center">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=900&auto=format&fit=crop"
          alt="Start learning"
          className="mx-auto mb-10 rounded-2xl shadow-md"
        />

        <h1 className="text-3xl font-bold mb-4">
          You haven’t created any courses yet
        </h1>

        <p className="text-muted-foreground max-w-xl mx-auto">
          Start by creating your first AI-powered course.  
          We’ll generate structured units, chapters, videos, and questions for you automatically.
        </p>
      </div>
    );
  }

  /* ---------------- COURSES GRID ---------------- */
  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-10">My Courses</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {courses.map((course) => {
          const image =
            course.image && course.image.trim().length > 0
              ? course.image
              : FALLBACK_IMAGE;

          return (
            <div
              key={course.id}
              className="group rounded-2xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition"
            >
              <div className="h-44 w-full overflow-hidden">
                <img
                  src={image}
                  alt={course.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-5">
                <h2 className="text-lg font-semibold">{course.name}</h2>

                {course.category && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {course.category}
                  </p>
                )}

                <button
                  onClick={() => deleteCourse(course.id)}
                  className="mt-4 text-sm text-red-500 hover:text-red-600"
                >
                  Delete course
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
