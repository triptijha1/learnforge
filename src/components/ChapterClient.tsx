"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

type Question = {
  id: string;
  question: string;
  options: string;
  answer: string;
};

type Chapter = {
  id: string;
  name: string;
  content: string;
  summary: string;
  youtubeVideoId: string;
  videoLanguage: "EN" | "HI";
  questions: Question[];
};

export default function ChapterClient({ chapterId }: { chapterId: string }) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .post("/api/chapter/getChapter", { chapterId })
      .then((res) => setChapter(res.data))
      .finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) return <p>Loading chapter...</p>;
  if (!chapter) return <p>Chapter not found</p>;

  return (
    <div className="space-y-10">
      {/* 🎥 VIDEO */}
      <div className="aspect-video">
        <iframe
          className="w-full h-full rounded-xl"
          src={`https://www.youtube.com/embed/${chapter.youtubeVideoId}`}
          allowFullScreen
        />
      </div>

      {/* 📘 CONTENT */}
      <section>
        <h2 className="text-2xl font-bold mb-2">Learning Content</h2>
        <p className="whitespace-pre-line text-muted-foreground">
          {chapter.content}
        </p>
      </section>

      <Separator />

      {/* 📝 SUMMARY */}
      <section>
        <h2 className="text-2xl font-bold mb-2">Quick Notes</h2>
        <p className="whitespace-pre-line">{chapter.summary}</p>
      </section>

      <Separator />

      {/* ❓ QUIZ */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quiz</h2>
        <div className="space-y-6">
          {chapter.questions.map((q, i) => {
            const options = JSON.parse(q.options);
            return (
              <div key={q.id} className="border p-4 rounded-lg">
                <p className="font-semibold">
                  {i + 1}. {q.question}
                </p>
                <div className="grid gap-2 mt-2">
                  {options.map((opt: string, idx: number) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
