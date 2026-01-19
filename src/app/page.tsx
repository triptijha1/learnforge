import Link from "next/link";
import { ArrowRight, Sparkles, Brain, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <main className="w-full">
      {/* ================= HERO ================= */}
      <section className="py-32 text-center bg-background">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Build Courses with <span className="text-primary">AI</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Automatically generate chapters, summaries, videos, and quizzes.
          Learn faster. Teach smarter.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/create"
            className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 hover:opacity-90 transition"
          >
            Create a Course <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/explore"
            className="px-8 py-4 rounded-xl border font-semibold hover:bg-muted transition"
          >
            Explore Courses
          </Link>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="py-20 bg-muted/40">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <div>
            <h3 className="text-4xl font-bold">10×</h3>
            <p className="text-muted-foreground mt-2">
              Faster course creation
            </p>
          </div>

          <div>
            <h3 className="text-4xl font-bold">AI-Powered</h3>
            <p className="text-muted-foreground mt-2">
              Smart learning engine
            </p>
          </div>

          <div>
            <h3 className="text-4xl font-bold">24/7</h3>
            <p className="text-muted-foreground mt-2">
              Learn anytime, anywhere
            </p>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-28 bg-background">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold">
            Everything You Need to Learn Smarter
          </h2>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition">
              <Sparkles className="w-8 h-8 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg">
                AI-Generated Content
              </h3>
              <p className="text-muted-foreground mt-2">
                Chapters, explanations and summaries generated instantly.
              </p>
            </div>

            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition">
              <Brain className="w-8 h-8 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg">
                Structured Courses
              </h3>
              <p className="text-muted-foreground mt-2">
                Units and chapters designed for effective learning.
              </p>
            </div>

            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition">
              <Clock className="w-8 h-8 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg">
                Interactive Quizzes
              </h3>
              <p className="text-muted-foreground mt-2">
                Auto-generated MCQs to test understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-24 bg-muted/40 text-center">
        <h2 className="text-4xl font-bold">
          Start Learning the Smart Way
        </h2>

        <p className="mt-4 text-muted-foreground">
          Build your first AI-powered course in minutes.
        </p>

        <Link
          href="/create"
          className="inline-block mt-8 px-10 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
        >
          Create Your Course
        </Link>
      </section>
    </main>
  );
}
